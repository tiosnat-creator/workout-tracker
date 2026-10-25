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
