/** Create-only mutations never overwrite web edits. Legacy workout payloads remain valid. */
export type WorkoutSet = { liftId: string; weight: number; reps: number; rpe: number | null; notes: string | null };
export type Workout = { id: string; date: string; notes: string | null; setEntries: WorkoutSet[] };
export type Snapshot = {
  user: { id: string; email: string; name: string | null };
  lifts: Lift[];
  categories: Category[];
  sessions: Workout[];
  oneRepMaxes?: ManualOneRepMax[];
  bodyWeights?: BodyWeight[];
  capabilities?: string[];
};
export type WorkoutMutation = { mutationId: string; workout: Workout };
export type ManualOneRepMax = { id: string; liftId: string; weight: number; date: string; notes: string | null };
export type ManualMutation = { kind: 'manual-1rm'; mutationId: string; entry: ManualOneRepMax };
export type MobileMutation = WorkoutMutation | ManualMutation | ChangeMutation;
export function isManualMutation(value: MobileMutation): value is ManualMutation { return 'kind' in value && value.kind === 'manual-1rm'; }
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

export function parseMobileMutation(value: unknown): MobileMutation {
  const input = record(value);
  if (input.kind === 'change') return parseChange(input);
  if (input.kind === undefined) return parseMutation(value);
  if (input.kind !== 'manual-1rm') throw new ValidationError('Unsupported entry type.');
  const entry = record(input.entry);
  const mutationId = text(input.mutationId, 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mutationId) || entry.id !== mutationId) throw new ValidationError('Invalid entry ID.');
  const date = text(entry.date, 40);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(date) || !Number.isFinite(Date.parse(date))) throw new ValidationError('Invalid test date.');
  return { kind: 'manual-1rm', mutationId, entry: { id: mutationId, liftId: text(entry.liftId, 80), weight: number(entry.weight, 0.1, 2000), date: new Date(date).toISOString(), notes: notes(entry.notes) } };
}

export type Lift = { id: string; name: string; categoryId: string; archived: boolean; dashboardOrder?: number };
export type Category = { id: string; name: string; isUncategorized?: boolean; dashboardOrder?: number };
export type BodyWeight = { id: string; weight: number; date: string; notes: string | null };
export type EntityMap = { lifts: Lift; categories: Category; sessions: Workout; bodyWeights: BodyWeight };
export type ChangeMutation = { [K in keyof EntityMap]: { kind: 'change'; entity: K; mutationId: string; id: string; before: EntityMap[K] | null; after: EntityMap[K] | null } }[keyof EntityMap];
export function isWorkoutMutation(value: MobileMutation): value is WorkoutMutation { return !('kind' in value); }
function dateValue(value: unknown): string {
  const date = text(value, 40);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(date) || !Number.isFinite(Date.parse(date))) throw new ValidationError('Invalid date.');
  return new Date(date).toISOString();
}
function orderValue(value: unknown) {
  const order = number(value ?? 0, 0, 100000);
  if (!Number.isInteger(order)) throw new ValidationError('Invalid order.');
  return order;
}
export function parseEntity<K extends keyof EntityMap>(entity: K, value: unknown): EntityMap[K] {
  const row = record(value), id = text(row.id, 80);
  let result: EntityMap[keyof EntityMap];
  if (entity === 'lifts') {
    if (typeof row.archived !== 'boolean') throw new ValidationError('Invalid archive setting.');
    result = { id, name: text(row.name, 200).trim(), categoryId: text(row.categoryId, 80), archived: row.archived, dashboardOrder: orderValue(row.dashboardOrder) };
    if (!result.name) throw new ValidationError('Enter a name.');
  } else if (entity === 'categories') {
    if (row.isUncategorized !== undefined && typeof row.isUncategorized !== 'boolean') throw new ValidationError('Invalid category.');
    result = { id, name: text(row.name, 200).trim(), isUncategorized: row.isUncategorized ?? false, dashboardOrder: orderValue(row.dashboardOrder) };
    if (!result.name) throw new ValidationError('Enter a name.');
  } else if (entity === 'bodyWeights') {
    result = { id, weight: number(row.weight, 0.1, 1000), date: dateValue(row.date), notes: notes(row.notes) };
  } else if (entity === 'sessions') {
    // Reuse set validation while allowing existing server IDs and empty sessions.
    const uuid = '00000000-0000-4000-8000-000000000000';
    const empty = Array.isArray(row.setEntries) && row.setEntries.length === 0;
    const workout = parseMutation({ mutationId: uuid, workout: { ...row, id: uuid, setEntries: empty ? [{ liftId: 'validation', weight: 0, reps: 1, rpe: null, notes: null }] : row.setEntries } }).workout;
    result = { ...workout, id, setEntries: empty ? [] : workout.setEntries };
  } else throw new ValidationError('Unknown entry type.');
  return result as EntityMap[K];
}
function parseChange(input: Record<string, unknown>): ChangeMutation {
  const mutationId = text(input.mutationId, 80), id = text(input.id, 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mutationId)) throw new ValidationError('Invalid change ID.');
  const entity = text(input.entity, 20) as keyof EntityMap;
  if (!['lifts', 'categories', 'sessions', 'bodyWeights'].includes(entity)) throw new ValidationError('Unknown entry type.');
  const before = input.before === null ? null : parseEntity(entity, input.before);
  const after = input.after === null ? null : parseEntity(entity, input.after);
  if ((!before && !after) || (before && before.id !== id) || (after && after.id !== id)) throw new ValidationError('Invalid entry ID.');
  if (!before && id !== mutationId) throw new ValidationError('New entry and change IDs must match.');
  return { kind: 'change', mutationId, entity, id, before, after } as ChangeMutation;
}
/** Apply queued changes to the downloaded snapshot without hiding offline work. */
export function projectSnapshot(snapshot: Snapshot, mutations: MobileMutation[]): Snapshot {
  let view = structuredClone(snapshot);
  for (const mutation of mutations) {
    if (isWorkoutMutation(mutation)) {
      view.sessions = [mutation.workout, ...view.sessions.filter((w) => w.id !== mutation.workout.id)];
    } else if (isManualMutation(mutation)) {
      view.oneRepMaxes = [mutation.entry, ...(view.oneRepMaxes ?? []).filter((e) => e.id !== mutation.entry.id)];
    } else {
      const rows = (view[mutation.entity] ?? []).filter((row) => row.id !== mutation.id);
      if (mutation.after) rows.push(mutation.after as never);
      view = { ...view, [mutation.entity]: rows };
      if (mutation.entity === 'categories' && !mutation.after) {
        const fallback = view.categories.find((c) => c.isUncategorized);
        if (fallback) view.lifts = view.lifts.map((l) => l.categoryId === mutation.id ? { ...l, categoryId: fallback.id } : l);
      }
    }
  }
  return view;
}
