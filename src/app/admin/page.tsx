import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

const SECTIONS = [
  {
    href: "/admin/lifts",
    title: "Lifts",
    description: "Create, rename, and archive lifts in your database.",
  },
  {
    href: "/admin/categories",
    title: "Categories",
    description: "Add, rename, and delete the categories lifts are grouped by.",
  },
];

// Unlike /admin/lifts and /admin/categories (per-tenant data every MEMBER
// manages for themselves), /admin/users is privileged site administration —
// keep the section list built conditionally here, not just gated at the
// /admin/users route, so the two concepts don't blur under one prefix.
const USERS_SECTION = {
  href: "/admin/users",
  title: "Users",
  description: "Manage accounts, roles, and access.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const sections =
    user.role === "OWNER" || user.role === "ADMIN"
      ? [...SECTIONS, USERS_SECTION]
      : SECTIONS;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold tracking-tight uppercase">Admin</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded border border-border bg-surface p-4 hover:border-accent"
          >
            <p className="text-sm font-semibold">{section.title}</p>
            <p className="mt-1 text-xs text-muted">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
