import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
function load(file, mocks, env = {}) {
  const exports = {};
  const logs = [];
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => {
    if (!(name in mocks)) throw Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  }, process: { env }, console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args) }, Date });
  return { exports, logs };
}
const tokenUrl = 'https://example.com/login/verify?token=SYNTHETIC_SECRET';
for (const mode of ['production', 'development', 'test']) {
  test(`missing or blank mail settings fail closed without logging (${mode})`, async () => {
    for (const config of [{}, { RESEND_API_KEY: 'test' }, { RESEND_FROM_EMAIL: 'test@example.com' }, { RESEND_API_KEY: ' ', RESEND_FROM_EMAIL: 'test@example.com' }]) {
      const m = load('src/lib/mail.ts', { 'server-only': {}, resend: { Resend: class { constructor() { assert.fail('Provider must not be called'); } } } }, { NODE_ENV: mode, ...config });
      assert.equal(m.exports.isMagicLinkEmailConfigured(), false);
      await assert.rejects(m.exports.sendMagicLinkEmail('test@example.com', tokenUrl), /temporarily unavailable/);
      assert.equal(m.logs.length, 0);
    }
  });
}
test('configured delivery works and provider failures never expose request details', async () => {
  for (const outcome of ['ok', 'error', 'throw']) {
    let sent = 0;
    const m = load('src/lib/mail.ts', { 'server-only': {}, resend: { Resend: class {
      emails = { send: async payload => { sent++; assert.ok(payload.text.includes(tokenUrl)); if (outcome === 'throw') throw Error(tokenUrl); return { error: outcome === 'error' ? { message: tokenUrl } : null }; } };
    } } }, { RESEND_API_KEY: 'synthetic', RESEND_FROM_EMAIL: 'test@example.com' });
    assert.equal(m.exports.isMagicLinkEmailConfigured(), true);
    if (outcome === 'ok') await m.exports.sendMagicLinkEmail('test@example.com', tokenUrl);
    else await assert.rejects(m.exports.sendMagicLinkEmail('test@example.com', tokenUrl), e => e.message === 'Email sign-in is temporarily unavailable.');
    assert.equal(sent, 1); assert.equal(m.logs.length, 0);
  }
});
function actions(configured, prisma, send = async () => {}) {
  return load('src/lib/auth-actions.ts', {
    crypto, 'next/headers': { headers: async () => new Map([['host', 'example.com']]) },
    'next/navigation': { redirect: path => { throw Error(path); } },
    '@prisma/client': { Prisma: {} }, '@/lib/prisma': { prisma },
    '@/lib/email-crypto': { hashEmail: () => 'emailhash', encryptEmail: () => 'ciphertext' },
    '@/lib/mail': { isMagicLinkEmailConfigured: () => configured, sendMagicLinkEmail: send },
    '@/lib/session': { createUserSession: () => assert.fail('No session should be created') },
  }).exports;
}
test('missing configuration blocks issuance and redemption before database access', async () => {
  const a = actions(false, new Proxy({}, { get() { assert.fail('No DB access expected'); } }));
  await assert.rejects(a.requestMagicLink({ get: () => 'test@example.com' }), /login-unavailable/);
  await assert.rejects(a.consumeMagicLink('previously-issued-token'), /login-unavailable/);
});
test('failed delivery deletes its token and does not report success', async () => {
  let created, removed;
  const a = actions(true, { user: { findUnique: async () => ({ id: 'existing' }) }, magicLinkToken: {
    count: async () => 0,
    create: async ({ data }) => { created = data.tokenHash; },
    deleteMany: async ({ where }) => { if (where.tokenHash) removed = where.tokenHash; },
  } }, async () => { throw Error(tokenUrl); });
  await assert.rejects(a.requestMagicLink({ get: () => 'test@example.com' }), /login-unavailable/);
  assert.ok(created); assert.equal(removed, created);
});
