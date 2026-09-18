import { addSetEntry } from "@/lib/actions";
import {
  LiftWeightFields,
  type SessionLiftOption,
} from "@/components/LiftWeightFields";

type PlannedDefaults = { id: string; liftId: string; weight: number; reps: number };

export function ActualSetForm({
  sessionId,
  lifts,
  planned,
}: {
  sessionId: string;
  lifts: SessionLiftOption[];
  planned?: PlannedDefaults;
}) {
  const fieldKey = planned?.id ?? "additional";
  return (
    <form
      action={addSetEntry.bind(null, sessionId)}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-start"
    >
      {planned && <input type="hidden" name="plannedExerciseId" value={planned.id} />}
      <LiftWeightFields
        idPrefix={`actual-${fieldKey}`}
        lifts={lifts}
        defaultLiftId={planned?.liftId}
        defaultWeight={planned?.weight}
        liftLabel="Actual lift"
      />
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
      <button type="submit" className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground lg:mt-5 lg:h-[34px]">Log set</button>
    </form>
  );
}
