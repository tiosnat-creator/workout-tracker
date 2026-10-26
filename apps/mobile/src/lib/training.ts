import type { Snapshot } from './types';
export const estimate = (weight: number, reps: number) => Math.round((reps <= 1 ? weight : weight * (1 + reps / 30)) * 10) / 10;
export function liftProgress(view: Snapshot, liftId: string) {
  const manual = (view.oneRepMaxes ?? []).filter((e) => e.liftId === liftId).map((e) => ({ ...e, source: 'Tested' }));
  const estimated = view.sessions.flatMap((w) => {
    const sets = w.setEntries.filter((s) => s.liftId === liftId);
    return sets.length ? [{ id: w.id, date: w.date, weight: Math.max(...sets.map((s) => estimate(s.weight, s.reps))), source: 'Estimated' }] : [];
  });
  return [...manual, ...estimated].sort((a, b) => a.date.localeCompare(b.date));
}
export function bestMax(view: Snapshot, liftId: string) {
  const points = liftProgress(view, liftId);
  return points.length ? Math.max(...points.map((p) => p.weight)) : null;
}
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function dateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Enter a valid date as YYYY-MM-DD.');
  return `${value}T12:00:00.000Z`;
}
