import { deleteSetEntry, updateSetEntry } from "@/lib/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { formatWeight } from "@/lib/format";
import {
  LiftWeightFields,
  type SessionLiftOption,
} from "@/components/LiftWeightFields";

type ActualSet = { id: string; liftId: string; weight: number; reps: number; rpe: number | null; notes: string | null; lift: { name: string } };

export function SessionSetEditor({ set, sessionId, lifts, plannedLiftName }: { set: ActualSet; sessionId: string; lifts: SessionLiftOption[]; plannedLiftName?: string }) {
  const isVariation = plannedLiftName && plannedLiftName !== set.lift.name;
  return (
    <details id={`set-${set.id}`} className="group rounded border border-border bg-surface open:border-accent">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-medium">{set.lift.name} · {formatWeight(set.weight)} × {set.reps}{set.rpe ? ` @ RPE ${set.rpe}` : ""}</p>
          {(isVariation || set.notes) && <p className="text-xs text-muted">{isVariation ? `Variation from ${plannedLiftName}` : ""}{isVariation && set.notes ? " · " : ""}{set.notes ?? ""}</p>}
        </div>
        <span className="text-xs font-medium text-muted group-open:text-accent">Edit</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-border p-3">
        <form action={updateSetEntry.bind(null, set.id, sessionId)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <LiftWeightFields
            idPrefix={`set-${set.id}`}
            lifts={lifts}
            defaultLiftId={set.liftId}
            defaultWeight={set.weight}
            liftLabel="Actual lift"
          />
          <div>
            <label htmlFor={`reps-${set.id}`} className="mb-1 block text-xs font-medium">Reps</label>
            <input id={`reps-${set.id}`} name="reps" type="number" min="1" required defaultValue={set.reps} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label htmlFor={`rpe-${set.id}`} className="mb-1 block text-xs font-medium">RPE</label>
            <input id={`rpe-${set.id}`} name="rpe" type="number" step="0.5" min="1" max="10" defaultValue={set.rpe ?? ""} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label htmlFor={`notes-${set.id}`} className="mb-1 block text-xs font-medium">Set notes</label>
            <input id={`notes-${set.id}`} name="notes" defaultValue={set.notes ?? ""} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
          </div>
          <button type="submit" className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground lg:col-start-5">Save</button>
        </form>
        <ConfirmSubmitButton action={deleteSetEntry.bind(null, set.id)} confirmMessage={`Delete this ${set.lift.name} set (${formatWeight(set.weight)} × ${set.reps})?`} label="Delete set" className="self-start text-xs text-muted hover:text-red-600" />
      </div>
    </details>
  );
}
