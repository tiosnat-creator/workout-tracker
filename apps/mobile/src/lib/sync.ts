import type { Snapshot, MobileMutation } from './types';
export type Pending = { mutation: MobileMutation; accepted: boolean };
export type SyncStore = {
  list(): Promise<Pending[]>;
  markAccepted(id: string): Promise<void>;
  reconcile(snapshot: Snapshot, acceptedIds: string[]): Promise<void>;
};
/** A receipt is durable before the pull. A crash at any await safely retries. */
export async function synchronize(store: SyncStore, transport: {
  push(mutation: MobileMutation): Promise<{ acknowledged: string }>;
  pull(): Promise<Snapshot>;
}) {
  const pending = await store.list();
  const accepted: string[] = [];
  let uploadError: unknown;
  for (const row of pending) {
    if (row.accepted) { accepted.push(row.mutation.mutationId); continue; }
    try {
      const reply = await transport.push(row.mutation);
      if (reply.acknowledged !== row.mutation.mutationId) throw new Error('Unexpected upload receipt.');
      await store.markAccepted(reply.acknowledged);
      accepted.push(reply.acknowledged);
    } catch (error) { uploadError = error; break; }
  }
  // Even blocked uploads must not prevent downloading changes made on the website.
  const snapshot = await transport.pull();
  await store.reconcile(snapshot, accepted);
  if (uploadError) throw uploadError;
}
