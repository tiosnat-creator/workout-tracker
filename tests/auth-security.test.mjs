import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
function load(file, mocks = {}, env = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, Date, process: { env }, console, require: name => {
    if (name === 'server-only') return {};
    if (!(name in mocks)) throw Error(`Unexpected dependency ${name}`);
    return mocks[name];
  } });
  return exports;
}
test('email destinations require a canonical HTTPS origin and ignore request headers', () => {
  for (const value of [undefined, 'http://example.com', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com?host=evil', 'https://example.com/#evil']) {
    assert.throws(() => load('src/lib/auth-origin.ts', {}, { AUTH_ORIGIN: value }).authOrigin());
  }
  assert.equal(load('src/lib/auth-origin.ts', {}, { AUTH_ORIGIN: 'https://example.com/', MOBILE_AUTH_ORIGIN: 'https://other.example' }).authOrigin(), 'https://example.com');
  assert.equal(load('src/lib/auth-origin.ts', {}, { MOBILE_AUTH_ORIGIN: 'https://preview.example' }).authOrigin(), 'https://preview.example');
});
test('consuming or removing web tokens cannot reset admission limits', async () => {
  let attempts = 0, sent = 0;
  const actions = load('src/lib/auth-actions.ts', {
    crypto, 'next/navigation': { redirect: path => { throw Error(path); } },
    '@prisma/client': { Prisma: {} }, '@/lib/session': {},
    '@/lib/auth-origin': { authOrigin: () => 'https://trusted.example' },
    '@/lib/auth-rate-limit': { admitAuthRequest: async () => ++attempts <= 5 },
    '@/lib/email-crypto': { hashEmail: () => 'hash', encryptEmail: () => 'cipher' },
    '@/lib/mail': { isMagicLinkEmailConfigured: () => true, sendMagicLinkEmail: async (_, url) => { sent++; assert.equal(new URL(url).origin, 'https://trusted.example'); } },
    '@/lib/prisma': { prisma: { user: { findUnique: async () => ({ id: 'user' }) }, magicLinkToken: { create: async () => {} } } },
  });
  for (let i = 0; i < 10; i++) await assert.rejects(actions.requestMagicLink({ get: () => 'test@example.com' }), /sent=1/);
  assert.equal(sent, 5);
});
test('rate-limited mobile requests return opaque IDs without challenge writes', async () => {
  let attempts = 0, writes = 0;
  const route = load('src/app/api/mobile/v1/magic/route.ts', {
    'node:crypto': crypto,
    '@/lib/auth-origin': { authOrigin: () => 'https://trusted.example' },
    '@/lib/auth-rate-limit': { admitAuthRequest: async () => ++attempts <= 3 },
    '@/lib/email-crypto': { hashEmail: () => 'hash' },
    '@/lib/mail': { isMagicLinkEmailConfigured: () => true },
    '@/lib/mobile/auth': { digest: s => crypto.createHash('sha256').update(s).digest('hex') },
    '@/lib/mobile/http': { readJson: async () => ({ action: 'request', email: 'unknown@example.com', verifier: 'a'.repeat(64) }), json: (body, status = 200) => ({ body, status }) },
    '../../../../../../packages/shared/mobile': { ValidationError: class extends Error {} },
    '@/lib/prisma': { prisma: { user: { findUnique: async () => null }, mobileMagicChallenge: { create: async () => { writes++; } } } },
  });
  const ids = new Set();
  for (let i = 0; i < 8; i++) {
    const result = await route.POST({});
    assert.equal(result.status, 200); assert.match(result.body.id, /^[a-f0-9]{48}$/); ids.add(result.body.id);
  }
  assert.equal(ids.size, 8); assert.equal(writes, 3);
});
test('database admission is atomic, expires, cleans up and bounds rotating addresses', { skip: !process.env.AUTH_SECURITY_DATABASE_URL }, async () => {
  const connectionString = process.env.AUTH_SECURITY_DATABASE_URL;
  const url = new URL(connectionString);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/workout_mobile_test');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const { admitAuthRequest } = load('src/lib/auth-rate-limit.ts', { '@prisma/client': {}, '@/lib/prisma': { prisma } });
  try {
    await prisma.mobileLoginLimit.deleteMany();
    await prisma.mobileLoginLimit.create({ data: { key: 'expired', attempts: 1, resetAt: new Date(0) } });
    const results = await Promise.all(Array.from({ length: 20 }, () => admitAuthRequest('test:email', 5, 3600)));
    assert.equal(results.filter(Boolean).length, 5);
    assert.equal(await prisma.mobileLoginLimit.count({ where: { key: 'expired' } }), 0);
    await prisma.mobileLoginLimit.update({ where: { key: 'test:email' }, data: { resetAt: new Date(0) } });
    assert.equal(await admitAuthRequest('test:email', 5, 3600), true);
    await prisma.mobileLoginLimit.update({ where: { key: 'auth:global' }, data: { attempts: 1000 } });
    assert.equal(await admitAuthRequest('new:rotating-address', 5, 3600), false);
    assert.equal(await prisma.mobileLoginLimit.count({ where: { key: 'new:rotating-address' } }), 0);
  } finally { await prisma.mobileLoginLimit.deleteMany(); await prisma.$disconnect(); }
});
