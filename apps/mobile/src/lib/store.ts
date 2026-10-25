import * as SQLite from 'expo-sqlite';
import type { Snapshot, Workout, WorkoutMutation } from './types';
import type { Pending, SyncStore } from './sync';
let database: Promise<SQLite.SQLiteDatabase> | undefined;
function db() {
  return database ??= (async () => {
    const connection = await SQLite.openDatabaseAsync('workouts-v1.db');
    await connection.execAsync(`PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS cache (account TEXT PRIMARY KEY, snapshot TEXT NOT NULL, synced TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox (account TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, accepted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(account, id));
      CREATE TABLE IF NOT EXISTS drafts (account TEXT PRIMARY KEY, payload TEXT NOT NULL);`);
    return connection;
  })();
}
export async function readLocal(account: string) {
  const connection = await db();
  const cache = await connection.getFirstAsync<{ snapshot: string; synced: string }>('SELECT snapshot, synced FROM cache WHERE account = ?', account);
  const rows = await connection.getAllAsync<{ payload: string; accepted: number }>('SELECT payload, accepted FROM outbox WHERE account = ? ORDER BY rowid', account);
  const draft = await connection.getFirstAsync<{ payload: string }>('SELECT payload FROM drafts WHERE account = ?', account);
  return { snapshot: cache ? JSON.parse(cache.snapshot) as Snapshot : null, synced: cache?.synced ?? null,
    pending: rows.map((row): Pending => ({ mutation: JSON.parse(row.payload), accepted: !!row.accepted })),
    draft: draft ? JSON.parse(draft.payload) as Workout : null };
}
export async function saveDraft(account: string, workout: Workout) {
  await (await db()).runAsync('INSERT OR REPLACE INTO drafts(account,payload) VALUES (?,?)', account, JSON.stringify(workout));
}
export async function finishDraft(account: string, mutation: WorkoutMutation) {
  await (await db()).withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('INSERT INTO outbox(account,id,payload) VALUES (?,?,?)', account, mutation.mutationId, JSON.stringify(mutation));
    await tx.runAsync('DELETE FROM drafts WHERE account = ?', account);
  });
}
export async function discardDraft(account: string) {
  await (await db()).runAsync('DELETE FROM drafts WHERE account = ?', account);
}
export function syncStore(account: string): SyncStore {
  return {
    list: async () => (await readLocal(account)).pending,
    markAccepted: async (id) => { await (await db()).runAsync('UPDATE outbox SET accepted = 1 WHERE account = ? AND id = ?', account, id); },
    reconcile: async (snapshot, ids) => {
      await (await db()).withExclusiveTransactionAsync(async (tx) => {
        await tx.runAsync('INSERT OR REPLACE INTO cache(account,snapshot,synced) VALUES (?,?,?)', account, JSON.stringify(snapshot), new Date().toISOString());
        for (const id of ids) await tx.runAsync('DELETE FROM outbox WHERE account = ? AND id = ? AND accepted = 1', account, id);
      });
    },
  };
}
export async function clearLocal(account: string) {
  await (await db()).withExclusiveTransactionAsync(async (tx) => {
    for (const table of ['cache', 'outbox', 'drafts']) await tx.runAsync(`DELETE FROM ${table} WHERE account = ?`, account);
  });
}
