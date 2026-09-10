"use client";

import { useMemo, useState } from "react";
import { estimateOneRepMax, percentageTable } from "@/lib/oneRepMax";

type LiftOption = { id: string; name: string; oneRepMax: number | null };

export function Calculator({ lifts }: { lifts: LiftOption[] }) {
  const [liftId, setLiftId] = useState("");
  const [customWeight, setCustomWeight] = useState("");
  const [reverseWeight, setReverseWeight] = useState("");
  const [reverseReps, setReverseReps] = useState("");

  const selectedLift = lifts.find((l) => l.id === liftId);

  const baseWeight = useMemo(() => {
    if (customWeight) return Number(customWeight);
    if (selectedLift?.oneRepMax) return selectedLift.oneRepMax;
    return null;
  }, [customWeight, selectedLift]);

  const table = baseWeight && baseWeight > 0 ? percentageTable(baseWeight) : [];

  const reverseEstimate =
    reverseWeight && reverseReps
      ? estimateOneRepMax(Number(reverseWeight), Number(reverseReps))
      : null;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
          % of 1RM
        </h2>
        <div className="flex flex-col gap-3 rounded border border-border bg-surface p-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="lift" className="mb-1 block text-xs font-medium">
              Lift
            </label>
            <select
              id="lift"
              value={liftId}
              onChange={(e) => {
                setLiftId(e.target.value);
                setCustomWeight("");
              }}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="">— choose a lift —</option>
              {lifts.map((lift) => (
                <option key={lift.id} value={lift.id}>
                  {lift.name}
                  {lift.oneRepMax ? ` (${lift.oneRepMax} kg)` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label
              htmlFor="customWeight"
              className="mb-1 block text-xs font-medium"
            >
              or custom 1RM (kg)
            </label>
            <input
              id="customWeight"
              type="number"
              min="0"
              step="0.5"
              value={customWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        {table.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {table.map((row) => (
              <div
                key={row.percent}
                className="rounded border border-border bg-surface p-2 text-center"
              >
                <p className="text-xs text-muted">{row.percent}%</p>
                <p className="text-sm font-semibold">{row.weight} kg</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Choose a lift with a known 1RM, or enter a custom weight.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted uppercase">
          Estimate 1RM from a set
        </h2>
        <div className="flex flex-col gap-3 rounded border border-border bg-surface p-3 sm:flex-row sm:items-end">
          <div className="w-28">
            <label
              htmlFor="reverseWeight"
              className="mb-1 block text-xs font-medium"
            >
              Weight (kg)
            </label>
            <input
              id="reverseWeight"
              type="number"
              min="0"
              step="0.5"
              value={reverseWeight}
              onChange={(e) => setReverseWeight(e.target.value)}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="w-20">
            <label
              htmlFor="reverseReps"
              className="mb-1 block text-xs font-medium"
            >
              Reps
            </label>
            <input
              id="reverseReps"
              type="number"
              min="1"
              value={reverseReps}
              onChange={(e) => setReverseReps(e.target.value)}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
          </div>
          {reverseEstimate != null && (
            <p className="text-sm">
              Estimated 1RM:{" "}
              <span className="font-semibold">
                {Math.round(reverseEstimate * 10) / 10} kg
              </span>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
