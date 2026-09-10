import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLifts } from "@/lib/data";
import { createLift } from "@/lib/actions";
import { categoryLabel } from "@/lib/format";
import { LiftCategory } from "@prisma/client";

export default async function LiftsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const lifts = await getLifts(userId, true);

  const grouped = new Map<LiftCategory, typeof lifts>();
  for (const lift of lifts) {
    const group = grouped.get(lift.category) ?? [];
    group.push(lift);
    grouped.set(lift.category, group);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold tracking-tight uppercase">Lifts</h1>

      <form
        action={createLift}
        className="flex flex-col gap-3 rounded border border-border bg-surface p-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="name" className="mb-1 block text-xs font-medium">
            Lift name
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-xs font-medium">
            Category
          </label>
          <select
            id="category"
            name="category"
            className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
          >
            {Object.values(LiftCategory).map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
        >
          Add lift
        </button>
      </form>

      {lifts.length === 0 ? (
        <p className="text-sm text-muted">No lifts yet — add one above.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([category, categoryLifts]) => (
            <div key={category}>
              <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
                {categoryLabel(category)}
              </h2>
              <ul className="flex flex-col gap-2">
                {categoryLifts.map((lift) => (
                  <li key={lift.id}>
                    <Link
                      href={`/lifts/${lift.id}`}
                      className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2 hover:border-accent"
                    >
                      <span className="text-sm font-medium">
                        {lift.name}
                        {lift.archived && (
                          <span className="ml-2 text-xs text-muted">
                            (archived)
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
