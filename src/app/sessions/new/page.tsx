import { createSession } from "@/lib/actions";
import { DateInput } from "@/components/DateInput";

export default function NewSessionPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-lg font-bold tracking-tight uppercase">
        New session
      </h1>
      <form action={createSession} className="flex flex-col gap-3">
        <div>
          <label htmlFor="date" className="mb-1 block text-sm font-medium">
            Date
          </label>
          <DateInput
            id="date"
            name="date"
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          className="mt-2 rounded bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground"
        >
          Start session
        </button>
      </form>
    </div>
  );
}
