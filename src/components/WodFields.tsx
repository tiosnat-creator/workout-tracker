export function WodFields({ workout = "", results = "" }: { workout?: string; results?: string }) {
  return (<>
    <div>
      <label htmlFor="workout" className="mb-1 block text-sm font-medium">Workout</label>
      <textarea id="workout" name="workout" required rows={8} defaultValue={workout}
        placeholder={"For time: 3 rounds\n400 m run\n15 kettlebell swings\n10 pull-ups"}
        className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
    </div>
    <div>
      <label htmlFor="results" className="mb-1 block text-sm font-medium">Results (optional)</label>
      <textarea id="results" name="results" rows={5} defaultValue={results}
        placeholder="Time, rounds, weights, scaling, or how it felt…"
        className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
      <p className="mt-1 text-xs text-muted">You can return to record or update your results after training.</p>
    </div>
  </>);
}
