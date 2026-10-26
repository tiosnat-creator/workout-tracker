import Link from "next/link";
import { requireUserId } from "@/lib/roles";
import { getLifts } from "@/lib/data";

export default async function LiftsPage() {
  const userId = await requireUserId();
  const lifts = await getLifts(userId);

  const grouped = new Map<string, typeof lifts>();
  for (const lift of lifts) {
    const group = grouped.get(lift.category.name) ?? [];
    group.push(lift);
    grouped.set(lift.category.name, group);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold tracking-tight uppercase">Lifts</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/categories" className="text-sm text-accent">
            Manage Categories
          </Link>
          <Link href="/admin/lifts" className="text-sm text-accent">
            Manage Lifts
          </Link>
        </div>
      </div>

      {lifts.length === 0 ? (
        <p className="text-sm text-muted">
          No lifts yet.{" "}
          <Link href="/admin/lifts" className="text-accent underline">
            Add one
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([categoryName, categoryLifts]) => (
            <div key={categoryName}>
              <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
                {categoryName}
              </h2>
              <ul className="flex flex-col gap-2">
                {categoryLifts.map((lift) => (
                  <li key={lift.id}>
                    <Link
                      href={`/lifts/${lift.id}`}
                      className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2 hover:border-accent"
                    >
                      <span className="text-sm font-medium">{lift.name}</span>
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
