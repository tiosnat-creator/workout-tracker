import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSessionDetail } from "@/lib/data";
import { getLifts } from "@/lib/data";
import { addSetEntry, deleteSetEntry } from "@/lib/actions";
import { categoryLabel, formatDate, formatWeight } from "@/lib/format";

export default async function SessionDetailPage({
  params,
}: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [detail, lifts] = await Promise.all([
    getSessionDetail(id, userId),
    getLifts(userId),
  ]);

  if (!detail) notFound();

  const addSet = addSetEntry.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight uppercase">
          {formatDate(detail.date)}
        </h1>
        {detail.notes && (
          <p className="mt-1 text-sm text-muted">{detail.notes}</p>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
          Sets
        </h2>
        {detail.setEntries.length === 0 ? (
          <p className="text-sm text-muted">No sets logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {detail.setEntries.map((set) => (
              <li
                key={set.id}
                className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{set.lift.name}</p>
                  <p className="text-xs text-muted">
                    {formatWeight(set.weight)} × {set.reps}
                    {set.rpe ? ` @ RPE ${set.rpe}` : ""}
                  </p>
                </div>
                <form action={deleteSetEntry.bind(null, set.id, id)}>
                  <button
                    type="submit"
                    className="text-xs text-muted hover:text-red-600"
                  >
                    Remove
                  </button>
                </form>
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
                    {lift.name} ({categoryLabel(lift.category)})
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
