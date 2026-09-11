import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/current-user";
import { getLift, getCategories } from "@/lib/data";
import { updateLift } from "@/lib/actions";
import { ErrorBanner } from "@/components/ErrorBanner";
import { actionErrorMessage } from "@/lib/action-errors";

export default async function AdminLiftEditPage({
  params,
  searchParams,
}: PageProps<"/admin/lifts/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const [lift, categories] = await Promise.all([
    getLift(id, userId),
    getCategories(userId),
  ]);
  if (!lift) notFound();

  const saveLift = updateLift.bind(null, lift.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/lifts" className="text-sm text-accent">
          ← Manage lifts
        </Link>
        <h1 className="mt-1 text-lg font-bold tracking-tight uppercase">
          Edit {lift.name}
        </h1>
      </div>

      <ErrorBanner
        message={actionErrorMessage(Array.isArray(error) ? error[0] : error)}
      />

      <form
        action={saveLift}
        className="flex flex-col gap-3 rounded border border-border bg-surface p-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="name" className="mb-1 block text-xs font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={lift.name}
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="archived" defaultChecked={lift.archived} />
          Archived
        </label>
        <button
          type="submit"
          className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
        >
          Save
        </button>
      </form>
    </div>
  );
}
