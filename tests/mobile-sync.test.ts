import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMutation, type Snapshot, type WorkoutMutation } from '../packages/shared/mobile';
import { synchronize, type Pending, type SyncStore } from '../apps/mobile/src/lib/sync';
const id = 'b942852b-a1cc-44f1-bbbe-ef20320caf08';
function mutation(): WorkoutMutation {
  return { mutationId: id, workout: { id, date: '2026-10-24T10:00:00.000Z', notes: null, setEntries: [{ liftId: 'lift-a', weight: 80, reps: 5, rpe: null, notes: null }] } };
}
const snapshot: Snapshot = { user: { id: 'user-a', email: 'a@example.com', name: null }, categories: [], lifts: [], sessions: [] };
function fixture() {
  let rows: Pending[] = [{ mutation: mutation(), accepted: false }];
  let cached: Snapshot | null = null;
  const store: SyncStore = {
    list: async () => structuredClone(rows),
    markAccepted: async (id) => { rows.find((row) => row.mutation.mutationId === id)!.accepted = true; },
    reconcile: async (snapshot, ids) => { cached = snapshot; rows = rows.filter((row) => !ids.includes(row.mutation.mutationId)); },
  };
  return { store, rows: () => rows, cached: () => cached, add: (row: Pending) => rows.push(row) };
}
test('validates workout input without coercing numbers or permitting invalid sets', () => {
  assert.deepEqual(parseMutation(mutation()), mutation());
  for (const bad of [NaN, Infinity, -1, '80']) {
    const value = mutation(); (value.workout.setEntries[0] as {weight: unknown}).weight = bad;
    assert.throws(() => parseMutation(value));
  }
  for (const reps of [0, 1.5, 1001]) { const value = mutation(); value.workout.setEntries[0].reps = reps; assert.throws(() => parseMutation(value)); }
  assert.throws(() => parseMutation({ ...mutation(), mutationId: 'other-id' }));
  assert.throws(() => parseMutation({ ...mutation(), workout: { ...mutation().workout, setEntries: [] } }));
  assert.throws(() => parseMutation({ ...mutation(), workout: { ...mutation().workout, date: 'invalid' } }));
});
test('offline failures keep all pending workouts and the previous cache', async () => {
  const f = fixture();
  await assert.rejects(synchronize(f.store, { push: async () => { throw new Error('offline'); }, pull: async () => { throw new Error('offline'); } }));
  assert.equal(f.rows().length, 1); assert.equal(f.rows()[0].accepted, false); assert.equal(f.cached(), null);
});
test('a successful upload followed by failed download does not lose or re-upload the workout', async () => {
  const f = fixture(); let pushes = 0;
  const push = async () => { pushes++; return { acknowledged: id }; };
  await assert.rejects(synchronize(f.store, { push, pull: async () => { throw new Error('lost network'); } }));
  assert.equal(f.rows()[0].accepted, true);
  await synchronize(f.store, { push, pull: async () => snapshot });
  assert.equal(pushes, 1); assert.equal(f.rows().length, 0); assert.deepEqual(f.cached(), snapshot);
});
test('invalid acknowledgment cannot remove the local workout', async () => {
  const f = fixture();
  await assert.rejects(synchronize(f.store, { push: async () => ({ acknowledged: 'wrong' }), pull: async () => snapshot }));
  assert.equal(f.rows()[0].accepted, false); assert.deepEqual(f.cached(), snapshot);
});
test('new workouts saved during sync are retained for the next upload', async () => {
  const f = fixture();
  await synchronize(f.store, { push: async () => ({ acknowledged: id }), pull: async () => {
    const next = mutation(); next.mutationId = next.workout.id = '8a559b57-63d8-4c57-9313-3b4865101a44';
    f.add({ mutation: next, accepted: false }); return snapshot;
  } });
  assert.equal(f.rows().length, 1); assert.notEqual(f.rows()[0].mutation.mutationId, id);
});
test('conflicting uploads preserve the local copy while still downloading website changes', async () => {
  const f = fixture();
  await assert.rejects(synchronize(f.store, { push: async () => { throw new Error('conflict'); }, pull: async () => snapshot }));
  assert.equal(f.rows().length, 1); assert.deepEqual(f.cached(), snapshot);
});
test('accepted workout deleted on website is not resurrected by stale local copy', async () => {
  const f = fixture(); await f.store.markAccepted(id);
  await synchronize(f.store, { push: async () => { throw new Error('must not upload'); }, pull: async () => snapshot });
  assert.equal(f.rows().length, 0); assert.equal(f.cached()?.sessions.length, 0);
});

test('manual tests and entity changes project offline without mutating downloaded data', async () => {
  const { parseMobileMutation, projectSnapshot } = await import('../packages/shared/mobile');
  const manual = parseMobileMutation({ kind: 'manual-1rm', mutationId: id, entry: { id, liftId: 'lift-a', weight: 100, date: '2026-10-26T12:00:00.000Z', notes: 'Test' } });
  const category = parseMobileMutation({ kind: 'change', mutationId: id, entity: 'categories', id, before: null, after: { id, name: 'Squat', isUncategorized: false, dashboardOrder: 2 } });
  const view = projectSnapshot(snapshot, [manual, category]);
  assert.equal(view.oneRepMaxes?.[0].weight, 100); assert.equal(view.categories[0].name, 'Squat');
  assert.equal(snapshot.categories.length, 0);
  assert.throws(() => parseMobileMutation({ ...manual, entry: { id, liftId: 'lift-a', weight: 0, date: 'bad', notes: null } }));
  assert.throws(() => parseMobileMutation({ kind: 'change', mutationId: id, entity: 'users', id, before: null, after: {} }));
});
test('queued deletion and category reassignment remain visible while offline', async () => {
  const { projectSnapshot, parseMobileMutation } = await import('../packages/shared/mobile');
  const base: Snapshot = { ...snapshot, categories: [{ id: 'fallback', name: 'Uncategorized', isUncategorized: true }, { id, name: 'Old' }], lifts: [{ id: 'lift-a', name: 'Squat', categoryId: id, archived: false }], sessions: [mutation().workout] };
  const change = parseMobileMutation({ kind: 'change', entity: 'categories', mutationId: id, id, before: base.categories[1], after: null });
  const deleted = parseMobileMutation({ kind: 'change', entity: 'sessions', mutationId: id, id, before: base.sessions[0], after: null });
  const view = projectSnapshot(base, [change, deleted]);
  assert.equal(view.sessions.length, 0); assert.equal(view.lifts[0].categoryId, 'fallback');
});
