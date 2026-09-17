import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/roles";
import { getLiftDetail } from "@/lib/data";
import { addManualOneRepMax } from "@/lib/actions";
import { formatDate, formatWeight } from "@/lib/format";
import { OneRepMaxChart } from "@/components/OneRepMaxChart";
import { DateInput } from "@/components/DateInput";

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
              <li
                key={entry.id}
                className="flex justify-between text-sm text-muted"
              >
                <span>{formatDate(entry.date)}</span>
                <span>{formatWeight(entry.weight)}</span>
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
                className="flex justify-between text-sm text-muted"
              >
                <span>{formatDate(set.session.date)}</span>
                <span>
                  {formatWeight(set.weight)} × {set.reps}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
