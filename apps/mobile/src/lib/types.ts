import type { Snapshot } from '../../../../packages/shared/mobile';
export type { Snapshot, Workout, WorkoutSet, WorkoutMutation, MobileMutation, ManualMutation, ManualOneRepMax, ChangeMutation, EntityMap, Lift, Category, BodyWeight } from '../../../../packages/shared/mobile';
export { parseMutation, parseMobileMutation, isManualMutation, isWorkoutMutation, parseEntity, projectSnapshot } from '../../../../packages/shared/mobile';
export type Account = { origin: string; token: string; user: Snapshot['user']; expiresAt: string };
export const accountKey = (account: Account) => `${account.origin}|${account.user.id}`;
