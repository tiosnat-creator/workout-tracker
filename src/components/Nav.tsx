import Link from "next/link";
import { logout } from "@/lib/auth-actions";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/sessions", label: "Sessions" },
  { href: "/lifts", label: "Lifts" },
  { href: "/bodyweight", label: "Body Weight" },
  { href: "/calculator", label: "Calculator" },
  { href: "/account", label: "Account" },
];

export function Nav({ showUserManagement }: { showUserManagement: boolean }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-sm font-bold tracking-tight uppercase">
          Lifting Log
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-3 py-1.5 text-sm text-foreground/80 hover:bg-accent/10 hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
          {showUserManagement && (
            <Link
              href="/admin/users"
              className="rounded px-3 py-1.5 text-sm text-foreground/80 hover:bg-accent/10 hover:text-accent"
            >
              User Management
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded px-3 py-1.5 text-sm text-foreground/80 hover:bg-accent/10 hover:text-accent"
            >
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
