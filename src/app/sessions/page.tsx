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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight uppercase">
          Sessions
        </h1>
        <Link
          href="/sessions/new"
          className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
        >
          + Plan session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted">No sessions logged yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sessions.map((s) => {
            const actualLifts = [...new Set(s.setEntries.map((e) => e.lift.name))];
            const plannedLifts = s.plannedExercises.map((e) => e.lift.name);
            const workoutSummary = s.type === "WOD"
              ? (s.workout?.replace(/\s+/g, " ").trim() || "No workout recorded")
              : s.status === "PLANNED"
                ? plannedLifts.join(", ") || "Plan is empty"
                : actualLifts.length > 0
                  ? `${actualLifts.join(", ")} · ${s.setEntries.length} sets`
                  : "No sets logged";
            const resultSummary = s.results?.replace(/\s+/g, " ").trim();
            const statusLabel =
              s.status === "PLANNED"
                ? "Planned"
                : s.status === "IN_PROGRESS"
                  ? "In progress"
                  : "Completed";
            return (
              <li
                key={s.id}
                className="flex h-20 items-center gap-2 rounded border border-border bg-surface px-2.5 py-2 hover:border-accent"
              >
                <Link
                  href={`/sessions/${s.id}`}
                  className="flex min-w-0 flex-1 flex-col gap-0.5"
                >
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold">{formatDate(s.date)} · {s.type === "WOD" ? "WOD" : "Olympic Lifting"}</span>
                    <span className="shrink-0 text-[0.65rem] font-medium text-muted">{statusLabel}</span>
                  </span>
                  <span className="truncate text-xs" title={workoutSummary}>{workoutSummary}</span>
                  {s.type === "WOD" && (
                    <span className="truncate text-xs text-muted" title={resultSummary || undefined}>
                      {resultSummary ? `Result / time: ${resultSummary}` : "Awaiting results"}
                    </span>
                  )}
                </Link>
                <ConfirmSubmitButton
                  action={deleteSession.bind(null, s.id)}
                  confirmMessage={`Delete the session from ${formatDate(s.date)}? This removes its plan, workout, results and logged sets.`}
                  label="Delete"
                  className="min-h-8 shrink-0 px-1 text-[0.65rem] text-muted hover:text-red-600"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
