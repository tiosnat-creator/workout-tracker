/** Version 1 intentionally creates completed workouts only; it never overwrites web edits. */
export type WorkoutSet = { liftId: string; weight: number; reps: number; rpe: number | null; notes: string | null };
export type Workout = { id: string; date: string; notes: string | null; setEntries: WorkoutSet[] };
export type Snapshot = {
  user: { id: string; email: string; name: string | null };
  lifts: { id: string; name: string; categoryId: string; archived: boolean }[];
  categories: { id: string; name: string }[];
  sessions: Workout[];
};
export type WorkoutMutation = { mutationId: string; workout: Workout };
export class ValidationError extends Error {}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError('Expected an object.');
  return value as Record<string, unknown>;
}
function text(value: unknown, limit: number): string {
  if (typeof value !== 'string' || !value.length || value.length > limit) throw new ValidationError('Invalid text field.');
  return value;
}
function notes(value: unknown): string | null {
  if (value === null || value === '') return null;
  return text(value, 2000);
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new ValidationError('Invalid numeric field.');
  return value;
}
export function parseMutation(value: unknown): WorkoutMutation {
  const input = record(value), w = record(input.workout);
  const mutationId = text(input.mutationId, 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mutationId)) throw new ValidationError('Invalid mutation ID.');
  const id = text(w.id, 80);
  if (id !== mutationId) throw new ValidationError('Workout and mutation IDs must match.');
  const date = text(w.date, 40);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(date) || !Number.isFinite(Date.parse(date))) throw new ValidationError('Invalid workout date.');
  if (!Array.isArray(w.setEntries) || w.setEntries.length < 1 || w.setEntries.length > 200) throw new ValidationError('A workout needs 1–200 sets.');
  const setEntries = w.setEntries.map((value): WorkoutSet => {
    const s = record(value);
    const reps = number(s.reps, 1, 1000);
    if (!Number.isInteger(reps)) throw new ValidationError('Repetitions must be whole numbers.');
    return { liftId: text(s.liftId, 80), weight: number(s.weight, 0, 2000), reps,
      rpe: s.rpe === null ? null : number(s.rpe, 1, 10), notes: notes(s.notes) };
  });
  return { mutationId, workout: { id, date: new Date(date).toISOString(), notes: notes(w.notes), setEntries } };
}
