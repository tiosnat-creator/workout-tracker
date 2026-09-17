import Link from "next/link";
import { requireUserId } from "@/lib/roles";
import { getLifts, getCategories } from "@/lib/data";
import { createLift, updateLift } from "@/lib/actions";
import { ErrorBanner } from "@/components/ErrorBanner";
import { actionErrorMessage } from "@/lib/action-errors";

export default async function AdminLiftsPage({
  searchParams,
}: PageProps<"/admin/lifts">) {
  const userId = await requireUserId();

  const { error, saved } = await searchParams;
  const savedKey = Array.isArray(saved) ? saved[0] : saved;

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

      <p className="text-sm text-muted">
        Add lifts above, or use the edit icon beside a lift to rename it,
        change its category, or archive it.
      </p>

      <ErrorBanner
        message={actionErrorMessage(Array.isArray(error) ? error[0] : error)}
      />

      {savedKey && (
        <p role="status" className="text-sm text-accent">
          Lift saved.
        </p>
      )}

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
                  <li key={`${lift.id}-${savedKey ?? "initial"}`}>
                    <details className="group rounded border border-border bg-surface open:border-accent">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                        <span className="text-sm font-medium">
                          {lift.name}
                          {lift.archived && (
                            <span className="ml-2 text-xs text-muted">
                              (archived)
                            </span>
                          )}
                        </span>
                        <span
                          title={`Edit ${lift.name}`}
                          className="rounded p-1 text-muted group-open:text-accent"
                        >
                          <span className="sr-only">Edit {lift.name}</span>
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                          </svg>
                        </span>
                      </summary>
                      <form
                        action={updateLift.bind(null, lift.id)}
                        className="flex flex-col gap-3 border-t border-border p-3 sm:flex-row sm:items-end"
                      >
                        <div className="flex-1">
                          <label
                            htmlFor={`name-${lift.id}`}
                            className="mb-1 block text-xs font-medium"
                          >
                            Name
                          </label>
                          <input
                            id={`name-${lift.id}`}
                            name="name"
                            defaultValue={lift.name}
                            required
                            className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`category-${lift.id}`}
                            className="mb-1 block text-xs font-medium"
                          >
                            Category
                          </label>
                          <select
                            id={`category-${lift.id}`}
                            name="categoryId"
                            defaultValue={lift.categoryId}
                            className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                          >
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 pb-1 text-sm">
                          <input
                            type="checkbox"
                            name="archived"
                            defaultChecked={lift.archived}
                          />
                          Archived
                        </label>
                        <button
                          type="submit"
                          className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
                        >
                          Save
                        </button>
                      </form>
                    </details>
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
