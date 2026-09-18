import { addSetEntry } from "@/lib/actions";

type LiftOption = { id: string; name: string; category: { name: string } };
type PlannedDefaults = { id: string; liftId: string; weight: number; reps: number };

export function ActualSetForm({
  sessionId,
  lifts,
  planned,
}: {
  sessionId: string;
  lifts: LiftOption[];
  planned?: PlannedDefaults;
}) {
  const fieldKey = planned?.id ?? "additional";
  return (
    <form
      action={addSetEntry.bind(null, sessionId)}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
    >
      {planned && <input type="hidden" name="plannedExerciseId" value={planned.id} />}
      <div className="sm:col-span-2 lg:col-span-1">
        <label htmlFor={`actual-lift-${fieldKey}`} className="mb-1 block text-xs font-medium">Actual lift</label>
        <select id={`actual-lift-${fieldKey}`} name="liftId" required defaultValue={planned?.liftId} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent">
          {lifts.map((lift) => <option key={lift.id} value={lift.id}>{lift.name} ({lift.category.name})</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`actual-weight-${fieldKey}`} className="mb-1 block text-xs font-medium">Weight (kg)</label>
        <input id={`actual-weight-${fieldKey}`} name="weight" type="number" step="0.5" min="0" required defaultValue={planned?.weight} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      <div>
        <label htmlFor={`actual-reps-${fieldKey}`} className="mb-1 block text-xs font-medium">Reps</label>
        <input id={`actual-reps-${fieldKey}`} name="reps" type="number" min="1" required defaultValue={planned?.reps} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      <div>
        <label htmlFor={`actual-rpe-${fieldKey}`} className="mb-1 block text-xs font-medium">RPE</label>
        <input id={`actual-rpe-${fieldKey}`} name="rpe" type="number" step="0.5" min="1" max="10" className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      <div>
        <label htmlFor={`actual-notes-${fieldKey}`} className="mb-1 block text-xs font-medium">Set notes</label>
        <input id={`actual-notes-${fieldKey}`} name="notes" className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      <button type="submit" className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground lg:col-start-5">Log set</button>
    </form>
  );
}
