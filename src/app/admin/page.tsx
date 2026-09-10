import Link from "next/link";

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

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold tracking-tight uppercase">Admin</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => (
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
