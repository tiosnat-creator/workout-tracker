import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';

function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Date, require: name => {
    if (!(name in mocks)) throw Error(`Unexpected dependency ${name}`);
    return mocks[name];
  } });
  return exports;
}
const redirect = path => { throw Error(path); };
const form = values => ({ get: name => values[name] ?? null });
const profile = load('src/lib/signup-profile.ts', {});
function auth({ user = null, record = null, configured = true } = {}) {
  const state = { user, record, sent: 0, sessions: 0, claims: 0, created: 0, issued: null };
  const prisma = {
    magicLinkToken: {
      deleteMany: async () => {}, count: async () => 0,
      create: async ({ data }) => { state.issued = data; },
      findUnique: async () => state.record && { ...state.record },
      updateMany: async () => {
        if (state.claims) return { count: 0 };
        state.claims++; return { count: 1 };
      },
    },
    user: {
      findUnique: async () => state.user,
      create: async ({ data }) => { state.created++; return state.user = { id: 'new-user', onboardingCompletedAt: null, ...data }; },
      update: async () => {},
    },
  };
  const actions = load('src/lib/auth-actions.ts', {
    crypto, 'next/headers': { headers: async () => new Map([['host', 'example.com']]) },
    'next/navigation': { redirect }, '@prisma/client': { Prisma: {} },
    '@/lib/prisma': { prisma },
    '@/lib/email-crypto': { hashEmail: () => 'emailhash', encryptEmail: () => 'ciphertext' },
    '@/lib/mail': { isMagicLinkEmailConfigured: () => configured, sendMagicLinkEmail: async () => { state.sent++; } },
    '@/lib/session': { createUserSession: async () => { state.sessions++; } },
  });
  return { actions, state };
}
const validToken = purpose => ({ id: 'token', emailHash: 'emailhash', emailCiphertext: 'ciphertext', purpose, expiresAt: new Date(Date.now() + 60000), consumedAt: null });

test('login for an unknown email does not send a link or create an account', async () => {
  const { actions, state } = auth();
  await assert.rejects(actions.requestMagicLink(form({ email: 'new@example.com', purpose: 'SIGNUP' })), /\/login\?sent=1/);
  assert.equal(state.sent, 0); assert.equal(state.created, 0); assert.equal(state.issued, null);
});
test('signup issues a server-selected SIGNUP token without creating a user', async () => {
  const { actions, state } = auth();
  await assert.rejects(actions.requestSignupLink(form({ email: 'new@example.com', purpose: 'LOGIN' })), /\/signup\?sent=1/);
  assert.equal(state.issued.purpose, 'SIGNUP'); assert.equal(state.created, 0); assert.equal(state.sent, 1);
});
test('existing login issues a LOGIN token', async () => {
  const { actions, state } = auth({ user: { id: 'existing' } });
  await assert.rejects(actions.requestMagicLink(form({ email: 'existing@example.com' })), /\/login\?sent=1/);
  assert.equal(state.issued.purpose, 'LOGIN');
});
test('signup requires configured mail', async () => {
  const { actions, state } = auth({ configured: false });
  await assert.rejects(actions.requestSignupLink(form({ email: 'test@example.com' })), /signup\?error=login-unavailable/);
  assert.equal(state.issued, null);
});
test('verified new signup starts an incomplete MEMBER profile', async () => {
  const { actions, state } = auth({ record: validToken('SIGNUP') });
  await assert.rejects(actions.consumeMagicLink('synthetic'), /\/signup\/profile/);
  assert.equal(state.created, 1); assert.equal(state.user.role, 'MEMBER');
  assert.equal(state.user.onboardingCompletedAt, null); assert.equal(state.sessions, 1);
});
test('LOGIN tokens cannot create accounts', async () => {
  const { actions, state } = auth({ record: validToken('LOGIN') });
  await assert.rejects(actions.consumeMagicLink('synthetic'), /signup-required/);
  assert.equal(state.created, 0); assert.equal(state.sessions, 0);
});
test('existing completed account signing up again keeps its account and profile', async () => {
  const user = { id: 'existing', name: 'original', onboardingCompletedAt: new Date() };
  const { actions, state } = auth({ user, record: validToken('SIGNUP') });
  await assert.rejects(actions.consumeMagicLink('synthetic'), e => e.message === '/');
  assert.equal(state.created, 0); assert.equal(state.user.name, 'original');
});
test('unfinished signup resumes after a login link', async () => {
  const { actions } = auth({ user: { id: 'unfinished', onboardingCompletedAt: null }, record: validToken('LOGIN') });
  await assert.rejects(actions.consumeMagicLink('synthetic'), /\/signup\/profile/);
});
test('expired and consumed links cannot create users or sessions', async () => {
  for (const override of [{ expiresAt: new Date(0) }, { consumedAt: new Date() }]) {
    const { actions, state } = auth({ record: { ...validToken('SIGNUP'), ...override } });
    await assert.rejects(actions.consumeMagicLink('synthetic'), /invalid-link/);
    assert.equal(state.created, 0); assert.equal(state.sessions, 0);
  }
});
test('concurrent confirmations only create one session', async () => {
  const { actions, state } = auth({ record: validToken('SIGNUP') });
  await Promise.allSettled([actions.consumeMagicLink('synthetic'), actions.consumeMagicLink('synthetic')]);
  assert.equal(state.created, 1); assert.equal(state.sessions, 1);
});
test('disabled account cannot redeem signup', async () => {
  const { actions, state } = auth({ user: { id: 'disabled', disabledAt: new Date() }, record: validToken('SIGNUP') });
  await assert.rejects(actions.consumeMagicLink('synthetic'), /account-disabled/);
  assert.equal(state.sessions, 0);
});
const validProfile = { username: 'Lifter_1', gender: 'FEMALE', weight: '72.5' };
test('profile validates both gender options and kilograms', () => {
  for (const gender of ['MALE', 'FEMALE']) {
    const result = profile.validateSignupProfile({ ...validProfile, gender });
    assert.equal(result.data.gender, gender); assert.equal(result.data.weight, 72.5);
  }
});
test('invalid profile values are rejected on the server', () => {
  for (const override of [{ username: '' }, { username: 'ab' }, { username: '<script>' }, { username: 'x'.repeat(31) }, { gender: '' }, { gender: 'OTHER' }, { weight: '' }, { weight: '0' }, { weight: '-1' }, { weight: 'Infinity' }, { weight: '1e2' }, { weight: '72.55' }, { weight: '1001' }]) {
    assert.ok(profile.validateSignupProfile({ ...validProfile, ...override }).error, JSON.stringify(override));
  }
});
function signupAction(user) {
  const state = { completed: false, weights: [], categories: 0, updates: [], transactions: 0 };
  const tx = {
    user: { updateMany: async ({ where, data }) => {
      assert.equal(where.id, user.id); assert.equal(where.disabledAt, null);
      if (state.completed) return { count: 0 };
      state.completed = true; state.updates.push(data); return { count: 1 };
    } },
    bodyWeightEntry: { create: async ({ data }) => { state.weights.push(data); } },
    category: { upsert: async () => { state.categories++; } },
  };
  const actions = load('src/lib/signup-actions.ts', {
    'next/navigation': { redirect }, '@/lib/session': { getSessionUser: async () => user },
    '@/lib/signup-profile': profile,
    '@/lib/prisma': { prisma: { $transaction: async callback => { state.transactions++; return callback(tx); } } },
  });
  return { actions, state };
}
test('profile requires a verified session', async () => {
  const { actions, state } = signupAction(null);
  await assert.rejects(actions.completeSignup({}, form(validProfile)), e => e.message === '/signup');
  assert.equal(state.transactions, 0);
});
test('completed profiles cannot be overwritten through signup', async () => {
  const { actions, state } = signupAction({ id: 'existing', onboardingCompletedAt: new Date() });
  await assert.rejects(actions.completeSignup({}, form(validProfile)), e => e.message === '/');
  assert.equal(state.transactions, 0);
});
test('invalid profile preserves entered values and writes nothing', async () => {
  const { actions, state } = signupAction({ id: 'new', onboardingCompletedAt: null });
  const result = await actions.completeSignup({}, form({ ...validProfile, weight: '-1' }));
  assert.ok(result.error); assert.equal(result.values.username, 'Lifter_1'); assert.equal(state.transactions, 0);
});
test('profile saves for session user and duplicate submission adds no second weight', async () => {
  const { actions, state } = signupAction({ id: 'verified-user', onboardingCompletedAt: null });
  const submit = () => actions.completeSignup({}, form({ ...validProfile, userId: 'victim' }));
  await assert.rejects(submit(), e => e.message === '/');
  await assert.rejects(submit(), e => e.message === '/');
  assert.equal(state.weights.length, 1); assert.equal(state.weights[0].userId, 'verified-user');
  assert.equal(state.weights[0].weight, 72.5); assert.equal(state.categories, 1);
  assert.equal(state.updates[0].name, 'Lifter_1'); assert.equal(state.updates[0].gender, 'FEMALE');
});
test('unfinished signup cannot bypass onboarding through protected role helpers', async () => {
  const roles = load('src/lib/roles.ts', {
    'server-only': {}, 'next/navigation': { redirect },
    '@/lib/session': { getSessionUser: async () => ({ id: 'new', role: 'MEMBER', onboardingCompletedAt: null }) },
  });
  for (const name of ['requireUserId', 'requireAdmin', 'requireOwner']) {
    await assert.rejects(roles[name](), /\/signup\/profile/);
  }
  assert.equal(await roles.getCurrentUserId(), null);
});
