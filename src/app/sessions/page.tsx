import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/current-user";
import { getSessions } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default async function SessionsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const sessions = await getSessions(userId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight uppercase">
          Sessions
        </h1>
        <Link
          href="/sessions/new"
          className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
        >
          + New session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted">No sessions logged yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => {
            const lifts = [...new Set(s.setEntries.map((e) => e.lift.name))];
            return (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="flex flex-col gap-1 rounded border border-border bg-surface px-3 py-2 hover:border-accent sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-medium">
                    {formatDate(s.date)}
                  </span>
                  <span className="text-xs text-muted">
                    {lifts.length > 0 ? lifts.join(", ") : "No sets logged"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
