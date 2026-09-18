import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/roles";
import { getLifts, getSessionDetail } from "@/lib/data";
import {
  completeSession,
  deleteSession,
  reopenSession,
  startSession,
  updateSession,
} from "@/lib/actions";
import { formatDate, formatWeight } from "@/lib/format";
import { ActualSetForm } from "@/components/ActualSetForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DateInput } from "@/components/DateInput";
import { PlannedExerciseForm } from "@/components/PlannedExerciseForm";
import { SessionSetEditor } from "@/components/SessionSetEditor";

const statusStyles = {
  PLANNED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
} as const;

const statusLabels = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
} as const;

export default async function SessionDetailPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const userId = await requireUserId();
  const [detail, lifts] = await Promise.all([
    getSessionDetail(id, userId),
    getLifts(userId),
  ]);
  if (!detail) notFound();

  const unplannedSets = detail.setEntries.filter((set) => set.plannedExerciseId === null);

  return (
    <div className="flex flex-col gap-6">
      <details className="group rounded border border-border bg-surface open:border-accent">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight uppercase">{formatDate(detail.date)}</h1>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[detail.status]}`}>
                {statusLabels[detail.status]}
              </span>
            </div>
            {detail.planNotes && <p className="mt-1 text-sm text-muted">Plan: {detail.planNotes}</p>}
            {detail.notes && <p className="mt-1 text-sm text-muted">Workout: {detail.notes}</p>}
          </div>
          <span className="text-xs font-medium text-muted group-open:text-accent">Edit session</span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-border p-3">
          <form action={updateSession.bind(null, id)} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="session-date" className="mb-1 block text-xs font-medium">Date</label>
              <DateInput id="session-date" name="date" required defaultValue={detail.date.toISOString().slice(0, 10)} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
            </div>
            <div>
              <label htmlFor="plan-notes" className="mb-1 block text-xs font-medium">Plan notes</label>
              <input id="plan-notes" name="planNotes" defaultValue={detail.planNotes ?? ""} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="workout-notes" className="mb-1 block text-xs font-medium">Workout notes</label>
              <textarea id="workout-notes" name="notes" rows={3} defaultValue={detail.notes ?? ""} placeholder="How did the session feel? Record changes or observations." className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent" />
            </div>
            <button type="submit" className="justify-self-start rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground sm:col-span-2">Save session</button>
          </form>
          <ConfirmSubmitButton action={deleteSession.bind(null, id)} confirmMessage={`Delete the session from ${formatDate(detail.date)}? This removes its plan and all logged sets.`} label="Delete session" className="self-start text-xs text-muted hover:text-red-600" />
        </div>
      </details>

      {detail.status === "PLANNED" ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-muted uppercase">Session plan</h2>
            <p className="mt-1 text-xs text-muted">Add each lift with its target sets, reps, and working weight.</p>
          </div>
          {detail.plannedExercises.length > 0 && (
            <ul className="flex flex-col gap-2">
              {detail.plannedExercises.map((planned) => (
                <li key={planned.id}>
                  <details className="group rounded border border-border bg-surface open:border-accent">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                      <div>
                        <p className="text-sm font-medium">{planned.lift.name}</p>
                        <p className="text-xs text-muted">{planned.sets} × {planned.reps} at {formatWeight(planned.weight)}{planned.notes ? ` · ${planned.notes}` : ""}</p>
                      </div>
                      <span className="text-xs font-medium text-muted group-open:text-accent">Edit</span>
                    </summary>
                    <div className="border-t border-border p-3">
                      <PlannedExerciseForm sessionId={id} lifts={lifts} planned={planned} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
          {lifts.length === 0 ? (
            <p className="text-sm text-muted">Add lifts on the Lifts page before building a session plan.</p>
          ) : (
            <div className="rounded border border-border bg-surface p-3">
              <PlannedExerciseForm sessionId={id} lifts={lifts} />
            </div>
          )}
          <form action={startSession.bind(null, id)}>
            <button type="submit" className="rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">Start workout</button>
          </form>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase">Workout against plan</h2>
              <p className="mt-1 text-xs text-muted">Log each set as performed. Change the lift, weight, or reps to capture variations.</p>
            </div>
            {detail.plannedExercises.length === 0 ? (
              <p className="text-sm text-muted">This session has no planned exercises. Add the work performed below.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {detail.plannedExercises.map((planned) => (
                  <article key={planned.id} className="rounded border border-border bg-surface p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">{planned.lift.name}</h3>
                        <p className="text-xs text-muted">Planned: {planned.sets} × {planned.reps} at {formatWeight(planned.weight)}{planned.notes ? ` · ${planned.notes}` : ""}</p>
                      </div>
                      <span className="text-xs text-muted">{planned.actualSets.length} / {planned.sets} sets logged</span>
                    </div>
                    {planned.actualSets.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        {planned.actualSets.map((set) => <SessionSetEditor key={set.id} set={set} sessionId={id} lifts={lifts} plannedLiftName={planned.lift.name} />)}
                      </div>
                    )}
                    {detail.status === "IN_PROGRESS" && (
                      <details className="group mt-3 rounded border border-dashed border-border open:border-accent">
                        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-accent [&::-webkit-details-marker]:hidden">+ Log set</summary>
                        <div className="border-t border-border p-3"><ActualSetForm sessionId={id} lifts={lifts} planned={planned} /></div>
                      </details>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase">Additional work</h2>
              <p className="mt-1 text-xs text-muted">Sets that were not part of the original plan.</p>
            </div>
            {unplannedSets.length > 0 && (
              <div className="flex flex-col gap-2">
                {unplannedSets.map((set) => <SessionSetEditor key={set.id} set={set} sessionId={id} lifts={lifts} />)}
              </div>
            )}
            {detail.status === "IN_PROGRESS" && lifts.length > 0 && (
              <div className="rounded border border-border bg-surface p-3"><ActualSetForm sessionId={id} lifts={lifts} /></div>
            )}
          </section>

          {detail.status === "IN_PROGRESS" ? (
            <form action={completeSession.bind(null, id)}>
              <button type="submit" className="rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">Complete workout</button>
            </form>
          ) : (
            <form action={reopenSession.bind(null, id)}>
              <button type="submit" className="rounded border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent">Reopen workout</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
