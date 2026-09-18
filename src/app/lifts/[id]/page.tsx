import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/roles";
import { getLiftDetail } from "@/lib/data";
import {
  addManualOneRepMax,
  deleteManualOneRepMax,
  updateManualOneRepMax,
} from "@/lib/actions";
import { formatDate, formatWeight } from "@/lib/format";
import { OneRepMaxChart } from "@/components/OneRepMaxChart";
import { DateInput } from "@/components/DateInput";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export default async function LiftDetailPage({
  params,
}: PageProps<"/lifts/[id]">) {
  const { id } = await params;
  const userId = await requireUserId();

  const detail = await getLiftDetail(id, userId);
  if (!detail) notFound();

  const { lift, points, current, recentSets, manualEntries } = detail;
  const chartPoints = points.map((p) => ({
    date: p.date.toISOString(),
    weight: p.weight,
    source: p.source,
  }));

  const addOneRepMax = addManualOneRepMax.bind(null, lift.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs text-muted">{lift.category.name}</p>
        <h1 className="text-lg font-bold tracking-tight uppercase">
          {lift.name}
        </h1>
        {current && (
          <p className="mt-1 text-3xl font-bold">
            {formatWeight(current.weight)}
            <span className="ml-2 text-sm font-normal text-muted">
              current 1RM
            </span>
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
          Progress
        </h2>
        <OneRepMaxChart points={chartPoints} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
          Add manual 1RM test
        </h2>
        <form
          action={addOneRepMax}
          className="flex flex-col gap-3 rounded border border-border bg-surface p-3 sm:flex-row sm:items-end"
        >
          <div className="w-28">
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
          <div>
            <label htmlFor="date" className="mb-1 block text-xs font-medium">
              Date
            </label>
            <DateInput
              id="date"
              name="date"
              required
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="notes" className="mb-1 block text-xs font-medium">
              Notes (optional)
            </label>
            <input
              id="notes"
              name="notes"
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

        {manualEntries.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {manualEntries.map((entry) => (
              <li key={entry.id}>
                <details className="group rounded border border-border bg-surface open:border-accent">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                    <span className="text-sm text-muted">
                      {formatDate(entry.date)}
                      {entry.notes ? ` · ${entry.notes}` : ""}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {formatWeight(entry.weight)}
                      </span>
                      <span className="text-xs font-medium text-muted group-open:text-accent">
                        Edit
                      </span>
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-border p-3">
                    <form
                      action={updateManualOneRepMax.bind(null, entry.id, lift.id)}
                      className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    >
                      <div className="w-28">
                        <label htmlFor={`weight-${entry.id}`} className="mb-1 block text-xs font-medium">
                          Weight (kg)
                        </label>
                        <input
                          id={`weight-${entry.id}`}
                          name="weight"
                          type="number"
                          step="0.5"
                          min="0.5"
                          required
                          defaultValue={entry.weight}
                          className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label htmlFor={`date-${entry.id}`} className="mb-1 block text-xs font-medium">
                          Date
                        </label>
                        <DateInput
                          id={`date-${entry.id}`}
                          name="date"
                          required
                          defaultValue={entry.date.toISOString().slice(0, 10)}
                          className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor={`notes-${entry.id}`} className="mb-1 block text-xs font-medium">
                          Notes (optional)
                        </label>
                        <input
                          id={`notes-${entry.id}`}
                          name="notes"
                          defaultValue={entry.notes ?? ""}
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
                      action={deleteManualOneRepMax.bind(null, entry.id, lift.id)}
                      confirmMessage={`Delete the ${formatWeight(entry.weight)} 1RM entry from ${formatDate(entry.date)}?`}
                      label="Delete entry"
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
          Recent sets
        </h2>
        {recentSets.length === 0 ? (
          <p className="text-sm text-muted">No sets logged for this lift yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {recentSets.map((set) => (
              <li
                key={set.id}
                className="flex items-center justify-between gap-3 text-sm text-muted"
              >
                <span>{formatDate(set.session.date)}</span>
                <span className="flex items-center gap-3">
                  <span>
                    {formatWeight(set.weight)} × {set.reps}
                  </span>
                  <Link
                    href={`/sessions/${set.sessionId}#set-${set.id}`}
                    className="text-xs font-medium text-accent"
                  >
                    Edit
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
