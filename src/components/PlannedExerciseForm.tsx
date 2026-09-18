import {
  addPlannedExercise,
  deletePlannedExercise,
  updatePlannedExercise,
} from "@/lib/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

type LiftOption = { id: string; name: string; category: { name: string } };
type PlannedExercise = {
  id: string;
  liftId: string;
  sets: number;
  reps: number;
  weight: number;
  notes: string | null;
  lift: { name: string };
};

export function PlannedExerciseForm({
  sessionId,
  lifts,
  planned,
}: {
  sessionId: string;
  lifts: LiftOption[];
  planned?: PlannedExercise;
}) {
  const key = planned?.id ?? "new";
  const action = planned
    ? updatePlannedExercise.bind(null, planned.id, sessionId)
    : addPlannedExercise.bind(null, sessionId);

  return (
    <div className="flex flex-col gap-3">
      <form
        action={action}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
      >
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor={`planned-lift-${key}`} className="mb-1 block text-xs font-medium">Lift</label>
          <select id={`planned-lift-${key}`} name="liftId" required defaultValue={planned?.liftId} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent">
            {lifts.map((lift) => <option key={lift.id} value={lift.id}>{lift.name} ({lift.category.name})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`planned-sets-${key}`} className="mb-1 block text-xs font-medium">Sets</label>
          <input id={`planned-sets-${key}`} name="sets" type="number" min="1" required defaultValue={planned?.sets ?? 3} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
        <div>
          <label htmlFor={`planned-reps-${key}`} className="mb-1 block text-xs font-medium">Reps</label>
          <input id={`planned-reps-${key}`} name="reps" type="number" min="1" required defaultValue={planned?.reps ?? 3} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
        <div>
          <label htmlFor={`planned-weight-${key}`} className="mb-1 block text-xs font-medium">Weight (kg)</label>
          <input id={`planned-weight-${key}`} name="weight" type="number" step="0.5" min="0" required defaultValue={planned?.weight} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
        <div>
          <label htmlFor={`planned-notes-${key}`} className="mb-1 block text-xs font-medium">Notes</label>
          <input id={`planned-notes-${key}`} name="notes" defaultValue={planned?.notes ?? ""} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
        <button type="submit" className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground lg:col-start-5">
          {planned ? "Save" : "Add to plan"}
        </button>
      </form>
      {planned && (
        <ConfirmSubmitButton
          action={deletePlannedExercise.bind(null, planned.id, sessionId)}
          confirmMessage={`Remove ${planned.lift.name} from this plan?`}
          label="Remove from plan"
          className="self-start text-xs text-muted hover:text-red-600"
        />
      )}
    </div>
  );
}
