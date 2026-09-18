import { requireUserId } from "@/lib/roles";
import { getCategoriesWithLiftCounts } from "@/lib/data";
import { createCategory, renameCategory, deleteCategory } from "@/lib/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { actionErrorMessage } from "@/lib/action-errors";

export default async function AdminCategoriesPage({
  searchParams,
}: PageProps<"/admin/categories">) {
  const userId = await requireUserId();

  const { error, saved } = await searchParams;
  const savedKey = Array.isArray(saved) ? saved[0] : saved;
  const categories = await getCategoriesWithLiftCounts(userId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold tracking-tight uppercase">
        Manage Categories
      </h1>

      <p className="text-sm text-muted">
        Add categories above, or use the edit icon beside a category to rename
        or delete it.
      </p>

      <ErrorBanner
        message={actionErrorMessage(Array.isArray(error) ? error[0] : error)}
      />

      {savedKey && (
        <p role="status" className="text-sm text-accent">
          Category saved.
        </p>
      )}

      <form
        action={createCategory}
        className="flex flex-col gap-3 rounded border border-border bg-surface p-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="name" className="mb-1 block text-xs font-medium">
            Category name
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
        >
          Add category
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {categories.map((category) => {
          const renameAction = renameCategory.bind(null, category.id);

          if (category.isUncategorized) {
            return (
              <li
                key={category.id}
                className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2"
              >
                <span className="text-sm font-medium">{category.name}</span>
                <span className="text-xs text-muted">
                  {category._count.lifts} lift
                  {category._count.lifts === 1 ? "" : "s"}
                </span>
              </li>
            );
          }

          return (
            <li key={`${category.id}-${savedKey ?? "initial"}`}>
              <details className="group rounded border border-border bg-surface open:border-accent">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-medium">{category.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-muted">
                      {category._count.lifts} lift
                      {category._count.lifts === 1 ? "" : "s"}
                    </span>
                    <span
                      title={`Edit ${category.name}`}
                      className="rounded p-1 text-muted group-open:text-accent"
                    >
                      <span className="sr-only">Edit {category.name}</span>
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
                  </span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-border p-3 sm:flex-row sm:items-end">
                  <form
                    action={renameAction}
                    className="flex flex-1 items-end gap-2"
                  >
                    <div className="flex-1">
                      <label
                        htmlFor={`name-${category.id}`}
                        className="mb-1 block text-xs font-medium"
                      >
                        Name
                      </label>
                      <input
                        id={`name-${category.id}`}
                        name="name"
                        defaultValue={category.name}
                        required
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
                  <div className="pb-1">
                    <ConfirmSubmitButton
                      action={deleteCategory.bind(null, category.id)}
                      confirmMessage={
                        category._count.lifts > 0
                          ? `Delete "${category.name}"? ${category._count.lifts} lift${category._count.lifts === 1 ? "" : "s"} will move to Uncategorized.`
                          : `Delete "${category.name}"?`
                      }
                      label="Delete"
                      className="text-xs text-muted hover:text-red-600"
                    />
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
