import type { Snapshot } from '../../../../packages/shared/mobile';
export type { Snapshot, Workout, WorkoutSet, WorkoutMutation } from '../../../../packages/shared/mobile';
export { parseMutation } from '../../../../packages/shared/mobile';
export type Account = { origin: string; token: string; user: Snapshot['user']; expiresAt: string };
export const accountKey = (account: Account) => `${account.origin}|${account.user.id}`;
