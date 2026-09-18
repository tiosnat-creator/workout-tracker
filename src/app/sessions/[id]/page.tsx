import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/roles";
import { getSessionDetail } from "@/lib/data";
import { getLifts } from "@/lib/data";
import {
  addSetEntry,
  deleteSession,
  deleteSetEntry,
  updateSession,
  updateSetEntry,
} from "@/lib/actions";
import { formatDate, formatWeight } from "@/lib/format";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DateInput } from "@/components/DateInput";

export default async function SessionDetailPage({
  params,
}: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const userId = await requireUserId();

  const [detail, lifts] = await Promise.all([
    getSessionDetail(id, userId),
    getLifts(userId),
  ]);

  if (!detail) notFound();

  const addSet = addSetEntry.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <details className="group rounded border border-border bg-surface open:border-accent">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase">
              {formatDate(detail.date)}
            </h1>
            {detail.notes && (
              <p className="mt-1 text-sm text-muted">{detail.notes}</p>
            )}
          </div>
          <span className="text-xs font-medium text-muted group-open:text-accent">
            Edit session
          </span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-border p-3">
          <form
            action={updateSession.bind(null, id)}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div>
              <label htmlFor="session-date" className="mb-1 block text-xs font-medium">
                Date
              </label>
              <DateInput
                id="session-date"
                name="date"
                required
                defaultValue={detail.date.toISOString().slice(0, 10)}
                className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="session-notes" className="mb-1 block text-xs font-medium">
                Notes (optional)
              </label>
              <input
                id="session-notes"
                name="notes"
                defaultValue={detail.notes ?? ""}
                className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
            >
              Save
            </button>
          </form>
          <ConfirmSubmitButton
            action={deleteSession.bind(null, id)}
            confirmMessage={`Delete the session from ${formatDate(detail.date)}? This removes all its logged sets too.`}
            label="Delete session"
            className="self-start text-xs text-muted hover:text-red-600"
          />
        </div>
      </details>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
          Sets
        </h2>
        {detail.setEntries.length === 0 ? (
          <p className="text-sm text-muted">No sets logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {detail.setEntries.map((set) => (
              <li key={set.id} id={`set-${set.id}`}>
                <details className="group rounded border border-border bg-surface open:border-accent">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                    <div>
                      <p className="text-sm font-medium">{set.lift.name}</p>
                      <p className="text-xs text-muted">
                        {formatWeight(set.weight)} × {set.reps}
                        {set.rpe ? ` @ RPE ${set.rpe}` : ""}
                        {set.notes ? ` · ${set.notes}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted group-open:text-accent">
                      Edit
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-border p-3">
                    <form
                      action={updateSetEntry.bind(null, set.id, id)}
                      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
                    >
                      <div className="sm:col-span-2 lg:col-span-1">
                        <label htmlFor={`lift-${set.id}`} className="mb-1 block text-xs font-medium">
                          Lift
                        </label>
                        <select
                          id={`lift-${set.id}`}
                          name="liftId"
                          defaultValue={set.liftId}
                          className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                        >
                          {lifts.map((lift) => (
                            <option key={lift.id} value={lift.id}>
                              {lift.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`weight-${set.id}`} className="mb-1 block text-xs font-medium">
                          Weight (kg)
                        </label>
                        <input
                          id={`weight-${set.id}`}
                          name="weight"
                          type="number"
                          step="0.5"
                          min="0"
                          required
                          defaultValue={set.weight}
                          className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label htmlFor={`reps-${set.id}`} className="mb-1 block text-xs font-medium">
                          Reps
                        </label>
                        <input
                          id={`reps-${set.id}`}
                          name="reps"
                          type="number"
                          min="1"
                          required
                          defaultValue={set.reps}
                          className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label htmlFor={`rpe-${set.id}`} className="mb-1 block text-xs font-medium">
                          RPE
                        </label>
                        <input
                          id={`rpe-${set.id}`}
                          name="rpe"
                          type="number"
                          step="0.5"
                          min="1"
                          max="10"
                          defaultValue={set.rpe ?? ""}
                          className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label htmlFor={`notes-${set.id}`} className="mb-1 block text-xs font-medium">
                          Notes
                        </label>
                        <input
                          id={`notes-${set.id}`}
                          name="notes"
                          defaultValue={set.notes ?? ""}
                          className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground lg:col-start-5"
                      >
                        Save
                      </button>
                    </form>
                    <ConfirmSubmitButton
                      action={deleteSetEntry.bind(null, set.id)}
                      confirmMessage={`Delete this ${set.lift.name} set (${formatWeight(set.weight)} × ${set.reps})?`}
                      label="Delete set"
                      className="self-start text-xs text-muted hover:text-red-600"
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
          Add set
        </h2>
        {lifts.length === 0 ? (
          <p className="text-sm text-muted">
            No lifts in your database yet — add one on the Lifts page first.
          </p>
        ) : (
          <form
            action={addSet}
            className="flex flex-col gap-3 rounded border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div className="flex-1 min-w-[10rem]">
              <label htmlFor="liftId" className="mb-1 block text-xs font-medium">
                Lift
              </label>
              <select
                id="liftId"
                name="liftId"
                required
                className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
              >
                {lifts.map((lift) => (
                  <option key={lift.id} value={lift.id}>
                    {lift.name} ({lift.category.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label htmlFor="weight" className="mb-1 block text-xs font-medium">
                Weight (kg)
              </label>
              <input
                id="weight"
                name="weight"
                type="number"
                step="0.5"
                min="0"
                required
                className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="w-20">
              <label htmlFor="reps" className="mb-1 block text-xs font-medium">
                Reps
              </label>
              <input
                id="reps"
                name="reps"
                type="number"
                min="1"
                required
                className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="w-20">
              <label htmlFor="rpe" className="mb-1 block text-xs font-medium">
                RPE
              </label>
              <input
                id="rpe"
                name="rpe"
                type="number"
                step="0.5"
                min="1"
                max="10"
                className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
            >
              Add
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
