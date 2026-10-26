/** Run only against an isolated localhost database and Next server; see docs/android.md. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Snapshot } from '../packages/shared/mobile';
const connectionString = process.env.DATABASE_URL;
const origin = process.env.MOBILE_TEST_ORIGIN;
const enabled = !!connectionString && !!origin;
test('mobile API: isolation, retries, deletion, validation, revocation and throttling', { skip: !enabled }, async () => {
  const database = new URL(connectionString!);
  const server = new URL(origin!);
  assert.ok(['localhost', '127.0.0.1'].includes(database.hostname) && database.pathname === '/workout_mobile_test', 'Use only the dedicated local test database');
  assert.ok(['localhost', '127.0.0.1'].includes(server.hostname), 'Use a local test server');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const suffix = randomUUID();
  const password = 'test-password-only';
  const users: string[] = [];
  async function call(path: string, token?: string, body?: unknown, method?: string) {
    return fetch(`${origin}/api/mobile/v1/${path}`, { method: method ?? (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  }
  try {
    const a = await prisma.user.create({ data: { email: `mobile-a-${suffix}@example.test`, passwordHash: await bcrypt.hash(password, 10) } }); users.push(a.id);
    const b = await prisma.user.create({ data: { email: `mobile-b-${suffix}@example.test`, passwordHash: a.passwordHash } }); users.push(b.id);
    const ca = await prisma.category.create({ data: { userId: a.id, name: 'A' } });
    const cb = await prisma.category.create({ data: { userId: b.id, name: 'B' } });
    const la = await prisma.lift.create({ data: { userId: a.id, categoryId: ca.id, name: 'Squat' } });
    const lb = await prisma.lift.create({ data: { userId: b.id, categoryId: cb.id, name: 'Private lift' } });
    assert.equal((await call('sync')).status, 401);
    const response = await call('auth', undefined, { email: a.email, password });
    assert.equal(response.status, 200); const { token } = await response.json();
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await prisma.mobileToken.findFirst({ where: { userId: a.id } }))?.digest.length, 64);
    const before: Snapshot = await (await call('sync', token)).json();
    assert.deepEqual(before.lifts.map((l) => l.id), [la.id]);
    assert.equal(before.user.id, a.id);
    assert.equal('passwordHash' in before.user, false);
    const id = randomUUID();
    const mutation = { mutationId: id, workout: { id, date: new Date().toISOString(), notes: 'offline test', setEntries: [{ liftId: la.id, weight: 80, reps: 5, rpe: 8, notes: null }] } };
    const results = await Promise.all([call('sync', token, mutation), call('sync', token, mutation)]);
    assert.deepEqual(results.map((r) => r.status), [200, 200]);
    assert.equal(await prisma.session.count({ where: { id } }), 1);
    assert.equal(await prisma.setEntry.count({ where: { sessionId: id } }), 1);
    const changed = structuredClone(mutation); changed.workout.setEntries[0].weight = 90;
    assert.equal((await call('sync', token, changed)).status, 409);
    assert.equal((await prisma.setEntry.findFirst({ where: { sessionId: id } }))?.weight, 80);
    const foreign = structuredClone(mutation); foreign.mutationId = foreign.workout.id = randomUUID(); foreign.workout.setEntries[0].liftId = lb.id;
    assert.equal((await call('sync', token, foreign)).status, 409);
    assert.equal(await prisma.session.count({ where: { id: foreign.workout.id } }), 0);
    const invalid = structuredClone(mutation); invalid.workout.setEntries[0].reps = -1;
    assert.equal((await call('sync', token, invalid)).status, 400);
    await prisma.session.update({ where: { id }, data: { notes: 'Edited on website' } });
    assert.equal((await call('sync', token, mutation)).status, 200);
    const pulled: Snapshot = await (await call('sync', token)).json();
    assert.equal(pulled.sessions[0].notes, 'Edited on website');
    await prisma.session.delete({ where: { id } });
    assert.equal((await call('sync', token, mutation)).status, 200);
    assert.equal(await prisma.session.count({ where: { id } }), 0, 'Retry must not resurrect a deleted workout');
    // Manual max ownership, concurrent retries, and deletion receipts.
    const mid = randomUUID();
    const manual = { kind: 'manual-1rm', mutationId: mid, entry: { id: mid, liftId: la.id, weight: 110, date: new Date().toISOString(), notes: 'Tested' } };
    assert.deepEqual((await Promise.all([call('sync', token, manual), call('sync', token, manual)])).map((r) => r.status), [200, 200]);
    const wrongManual = structuredClone(manual); wrongManual.mutationId = wrongManual.entry.id = randomUUID(); wrongManual.entry.liftId = lb.id;
    assert.equal((await call('sync', token, wrongManual)).status, 409);
    assert.equal((await (await call('sync', token)).json()).oneRepMaxes.length, 1);
    await prisma.oneRepMaxEntry.delete({ where: { id: mid } });
    assert.equal((await call('sync', token, manual)).status, 200);
    assert.equal(await prisma.oneRepMaxEntry.count({ where: { id: mid } }), 0);
    // Compare-and-swap edits: stale changes cannot overwrite a website edit.
    const initial: Snapshot = await (await call('sync', token)).json();
    const liftBefore = initial.lifts[0];
    const edit = { kind: 'change', entity: 'lifts', mutationId: randomUUID(), id: la.id, before: liftBefore, after: { ...liftBefore, name: 'Mobile squat' } };
    await prisma.lift.update({ where: { id: la.id }, data: { name: 'Web squat' } });
    assert.equal((await call('sync', token, edit)).status, 409);
    assert.equal((await prisma.lift.findUnique({ where: { id: la.id } }))?.name, 'Web squat');
    const latest = (await (await call('sync', token)).json()).lifts[0];
    const validEdit = { ...edit, mutationId: randomUUID(), before: latest, after: { ...latest, name: 'Mobile squat' } };
    assert.equal((await call('sync', token, validEdit)).status, 200);
    assert.equal((await call('sync', token, validEdit)).status, 200);
    const bid = randomUUID();
    const body = { kind: 'change', entity: 'bodyWeights', mutationId: bid, id: bid, before: null, after: { id: bid, date: new Date().toISOString(), weight: 80, notes: null } };
    assert.equal((await call('sync', token, body)).status, 200);
    const bodyBefore = (await (await call('sync', token)).json()).bodyWeights[0];
    assert.equal((await call('sync', token, { ...body, mutationId: randomUUID(), before: bodyBefore, after: null })).status, 200);
    assert.equal((await call('sync', token, body)).status, 200);
    assert.equal(await prisma.bodyWeightEntry.count({ where: { id: bid } }), 0);
    const sid = randomUUID();
    const newSession = { kind: 'change', entity: 'sessions', mutationId: sid, id: sid, before: null, after: { ...mutation.workout, id: sid } };
    assert.equal((await call('sync', token, newSession)).status, 200);
    const queuedEdit = { ...newSession, mutationId: randomUUID(), before: newSession.after, after: { ...newSession.after, notes: 'Edited before first sync' } };
    assert.equal((await call('sync', token, queuedEdit)).status, 200, 'Offline edits should survive server-assigned set IDs');
    const fallback = await prisma.category.create({ data: { userId: a.id, name: 'Uncategorized', isUncategorized: true } });
    const categoryBefore = (await (await call('sync', token)).json()).categories.find((c: { id: string }) => c.id === ca.id);
    assert.equal((await call('sync', token, { kind: 'change', entity: 'categories', mutationId: randomUUID(), id: ca.id, before: categoryBefore, after: null })).status, 200);
    assert.equal((await prisma.lift.findUnique({ where: { id: la.id } }))?.categoryId, fallback.id);
    const fallbackBefore = (await (await call('sync', token)).json()).categories.find((c: { id: string }) => c.id === fallback.id);
    assert.equal((await call('sync', token, { kind: 'change', entity: 'categories', mutationId: randomUUID(), id: fallback.id, before: fallbackBefore, after: null })).status, 409);
    const sessionBefore = (await (await call('sync', token)).json()).sessions[0];
    assert.equal((await call('sync', token, { ...newSession, mutationId: randomUUID(), before: sessionBefore, after: { ...sessionBefore, setEntries: [] } })).status, 200);
    assert.equal(await prisma.setEntry.count({ where: { sessionId: sid } }), 0);
    await prisma.user.update({ where: { id: a.id }, data: { disabledAt: new Date() } });
    assert.equal((await call('sync', token)).status, 401);
    await prisma.user.update({ where: { id: a.id }, data: { disabledAt: null } });
    assert.equal((await call('auth', token, undefined, 'DELETE')).status, 200);
    assert.equal((await call('sync', token)).status, 401);
    const expiring = await (await call('auth', undefined, { email: b.email, password })).json();
    await prisma.mobileToken.updateMany({ where: { userId: b.id }, data: { expiresAt: new Date(0) } });
    assert.equal((await call('sync', expiring.token)).status, 401);
    for (let i = 0; i < 10; i++) {
      const failed = await call('auth', undefined, { email: b.email, password: 'wrong' });
      assert.equal(failed.status, i === 9 ? 429 : 401);
    }
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});

test('mobile magic link requires email confirmation plus device secret and revokes safely', { skip: !enabled }, async () => {
  const database = new URL(connectionString!); assert.ok(['localhost', '127.0.0.1'].includes(database.hostname) && database.pathname === '/workout_mobile_test');
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin!).hostname));
  const { createHash, randomBytes } = await import('node:crypto');
  const hash = (v: string) => createHash('sha256').update(v).digest('hex');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const user = await prisma.user.create({ data: { email: `magic-${randomUUID()}@example.test`, onboardingCompletedAt: new Date() } });
  const id = randomBytes(24).toString('hex'), secret = randomBytes(32).toString('hex'), verifier = randomBytes(40).toString('hex');
  const call = (body: unknown) => fetch(`${origin}/api/mobile/v1/magic`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    await prisma.mobileMagicChallenge.create({ data: { id, userId: user.id, tokenHash: hash(secret), verifierHash: hash(verifier), expiresAt: new Date(Date.now() + 60000) } });
    assert.deepEqual(await (await call({ action: 'claim', id, verifier })).json(), { pending: true });
    assert.equal((await call({ action: 'claim', id, verifier: '0'.repeat(80) })).status, 401);
    assert.equal((await call({ action: 'confirm', token: secret })).status, 200);
    assert.equal((await call({ action: 'confirm', token: secret })).status, 400);
    const replies = await Promise.all([call({ action: 'claim', id, verifier }), call({ action: 'claim', id, verifier })]);
    assert.deepEqual(replies.map((r) => r.status), [200, 200]);
    const first = await replies[0].json(), second = await replies[1].json();
    assert.equal(first.token, second.token); assert.equal(first.user.id, user.id);
    assert.equal(await prisma.mobileToken.count({ where: { userId: user.id } }), 1);
    await prisma.mobileToken.deleteMany({ where: { userId: user.id } });
    assert.equal((await call({ action: 'claim', id, verifier })).status, 401, 'A retry cannot resurrect a revoked device session');
    await prisma.mobileMagicChallenge.update({ where: { id }, data: { expiresAt: new Date(0) } });
    assert.equal((await call({ action: 'claim', id, verifier })).status, 401);
  } finally {
    await prisma.mobileMagicChallenge.deleteMany({ where: { id } });
    await prisma.user.delete({ where: { id: user.id } }); await prisma.$disconnect();
  }
});
