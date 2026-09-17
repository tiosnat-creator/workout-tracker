import Link from "next/link";
import { requireUserId } from "@/lib/roles";
import { getSessions } from "@/lib/data";
import { deleteSession } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export default async function SessionsPage() {
  const userId = await requireUserId();
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
              <li
                key={s.id}
                className="flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 hover:border-accent"
              >
                <Link
                  href={`/sessions/${s.id}`}
                  className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-medium">
                    {formatDate(s.date)}
                  </span>
                  <span className="text-xs text-muted">
                    {lifts.length > 0 ? lifts.join(", ") : "No sets logged"}
                  </span>
                </Link>
                <ConfirmSubmitButton
                  action={deleteSession.bind(null, s.id)}
                  confirmMessage={`Delete the session from ${formatDate(s.date)}? This removes all its logged sets too.`}
                  label="Delete"
                  className="shrink-0 text-xs text-muted hover:text-red-600"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
