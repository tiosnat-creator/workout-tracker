import Link from "next/link";
import { requireUserId } from "@/lib/roles";
import { getLifts, getCategories } from "@/lib/data";
import { createLift } from "@/lib/actions";
import { ErrorBanner } from "@/components/ErrorBanner";
import { actionErrorMessage } from "@/lib/action-errors";

export default async function AdminLiftsPage({
  searchParams,
}: PageProps<"/admin/lifts">) {
  const userId = await requireUserId();

  const { error } = await searchParams;

  const [lifts, categories] = await Promise.all([
    getLifts(userId, true),
    getCategories(userId),
  ]);

  const grouped = new Map<string, typeof lifts>();
  for (const lift of lifts) {
    const group = grouped.get(lift.category.name) ?? [];
    group.push(lift);
    grouped.set(lift.category.name, group);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold tracking-tight uppercase">
        Manage lifts
      </h1>

      <ErrorBanner
        message={actionErrorMessage(Array.isArray(error) ? error[0] : error)}
      />

      {categories.length === 0 ? (
        <p className="text-sm text-muted">
          You need at least one category first.{" "}
          <Link href="/admin/categories" className="text-accent underline">
            Add one
          </Link>
          .
        </p>
      ) : (
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
            <label
              htmlFor="categoryId"
              className="mb-1 block text-xs font-medium"
            >
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
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
      )}

      {lifts.length === 0 ? (
        <p className="text-sm text-muted">No lifts yet — add one above.</p>
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
                      href={`/admin/lifts/${lift.id}`}
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
