import { requireUserId } from "@/lib/roles";
import { getBodyWeightEntries, getCurrentBodyWeight } from "@/lib/data";
import {
  addBodyWeightEntry,
  deleteBodyWeightEntry,
  updateBodyWeightEntry,
} from "@/lib/actions";
import { formatDate, formatWeight } from "@/lib/format";
import { BodyWeightChart } from "@/components/BodyWeightChart";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DateInput } from "@/components/DateInput";

export default async function BodyWeightPage() {
  const userId = await requireUserId();

  const [entries, current] = await Promise.all([
    getBodyWeightEntries(userId),
    getCurrentBodyWeight(userId),
  ]);
  const chartPoints = [...entries]
    .reverse()
    .map((entry) => ({ date: entry.date.toISOString(), weight: entry.weight }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-lg font-bold tracking-tight uppercase">
          Body Weight
        </h1>
        {current && (
          <p className="mt-1 text-3xl font-bold">
            {formatWeight(current.weight)}
            <span className="ml-2 text-sm font-normal text-muted">
              as of {formatDate(current.date)}
            </span>
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
          Progress
        </h2>
        <BodyWeightChart points={chartPoints} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
          Add entry
        </h2>
        <form
          action={addBodyWeightEntry}
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
              step="0.1"
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
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
          History
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">No entries logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id}>
                <details className="group rounded border border-border bg-surface open:border-accent">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                    <div>
                      <p className="text-sm font-medium">
                        {formatWeight(entry.weight)}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(entry.date)}
                        {entry.notes ? ` · ${entry.notes}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted group-open:text-accent">
                      Edit
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-border p-3">
                    <form
                      action={updateBodyWeightEntry.bind(null, entry.id)}
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
                          step="0.1"
                          min="0.1"
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
                      action={deleteBodyWeightEntry.bind(null, entry.id)}
                      confirmMessage={`Delete the ${formatWeight(entry.weight)} entry from ${formatDate(entry.date)}?`}
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
    </div>
  );
}
