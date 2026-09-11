import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/current-user";
import { getCategoriesWithLiftCounts } from "@/lib/data";
import { createCategory, renameCategory, deleteCategory } from "@/lib/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";

export default async function AdminCategoriesPage({
  searchParams,
}: PageProps<"/admin/categories">) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const { error } = await searchParams;
  const categories = await getCategoriesWithLiftCounts(userId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold tracking-tight uppercase">
        Manage categories
      </h1>

      <ErrorBanner message={Array.isArray(error) ? error[0] : error} />

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
          return (
            <li
              key={category.id}
              className="flex flex-col gap-2 rounded border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              {category.isUncategorized ? (
                <span className="text-sm font-medium">{category.name}</span>
              ) : (
                <form
                  action={renameAction}
                  className="flex flex-1 items-center gap-2"
                >
                  <input
                    name="name"
                    defaultValue={category.name}
                    required
                    className="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="text-xs text-accent"
                  >
                    Rename
                  </button>
                </form>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  {category._count.lifts} lift
                  {category._count.lifts === 1 ? "" : "s"}
                </span>
                {!category.isUncategorized && (
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
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
