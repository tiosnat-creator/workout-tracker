import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/current-user";
import { getDashboardBoard, getSessions } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { DashboardBoard } from "@/components/DashboardBoard";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) notFound();

  const [groups, sessions] = await Promise.all([
    getDashboardBoard(userId),
    getSessions(userId),
  ]);

  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight uppercase">
          Dashboard
        </h1>
        <Link
          href="/sessions/new"
          className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
        >
          + New session
        </Link>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted uppercase">
            Current 1RMs
          </h2>
          {groups.length > 0 && (
            <p className="text-xs text-muted">
              Drag categories or tiles to reorder
            </p>
          )}
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-muted">
            No lifts yet.{" "}
            <Link href="/admin/lifts" className="text-accent underline">
              Add one
            </Link>
            .
          </p>
        ) : (
          <DashboardBoard groups={groups} />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted uppercase">
            Recent sessions
          </h2>
          <Link href="/sessions" className="text-sm text-accent">
            View all
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-muted">No sessions logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentSessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2 hover:border-accent"
                >
                  <span className="text-sm font-medium">
                    {formatDate(s.date)}
                  </span>
                  <span className="text-xs text-muted">
                    {s.setEntries.length} set
                    {s.setEntries.length === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
