"use client";

import { useMemo, useRef, useState } from "react";
import { weightFromPercentage } from "@/lib/oneRepMax";

export type SessionLiftOption = {
  id: string;
  name: string;
  category: { name: string };
  oneRepMax: number | null;
};

export function LiftWeightFields({
  idPrefix,
  lifts,
  defaultLiftId,
  defaultWeight,
  liftLabel = "Lift",
}: {
  idPrefix: string;
  lifts: SessionLiftOption[];
  defaultLiftId?: string;
  defaultWeight?: number;
  liftLabel?: string;
}) {
  const initialLift = lifts.find((lift) => lift.id === defaultLiftId);
  const [selectedLiftId, setSelectedLiftId] = useState(initialLift?.id ?? "");
  const [query, setQuery] = useState(initialLift?.name ?? "");
  const [showResults, setShowResults] = useState(false);
  const [weightMode, setWeightMode] = useState<"kg" | "percent">("kg");
  const [weight, setWeight] = useState(defaultWeight?.toString() ?? "");
  const [percent, setPercent] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);

  const selectedLift = lifts.find((lift) => lift.id === selectedLiftId);
  const oneRepMax = selectedLift?.oneRepMax ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredLifts = useMemo(
    () =>
      lifts
        .filter((lift) =>
          `${lift.name} ${lift.category.name}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
        )
        .slice(0, 8),
    [lifts, normalizedQuery],
  );

  const generatedWeight =
    weightMode === "percent" && oneRepMax && Number(percent) > 0
      ? weightFromPercentage(oneRepMax, Number(percent))
      : 0;

  function selectLift(lift: SessionLiftOption) {
    setSelectedLiftId(lift.id);
    setQuery(lift.name);
    setShowResults(false);
    searchInput.current?.setCustomValidity("");
    if (!lift.oneRepMax) {
      setWeightMode("kg");
      setPercent("");
    }
  }

  function changeQuery(value: string) {
    setQuery(value);
    setShowResults(true);
    const exact = lifts.find(
      (lift) => lift.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
    );
    setSelectedLiftId(exact?.id ?? "");
    searchInput.current?.setCustomValidity(
      exact ? "" : "Choose a lift from the search results.",
    );
  }

  function choosePercentMode() {
    if (!oneRepMax) return;
    setWeightMode("percent");
    if (!percent && Number(weight) > 0) {
      setPercent(String(Math.round((Number(weight) / oneRepMax) * 1000) / 10));
    }
  }

  return (
    <>
      <div className="relative sm:col-span-2 lg:col-span-1">
        <label htmlFor={`${idPrefix}-lift-search`} className="mb-1 block text-xs font-medium">
          {liftLabel}
        </label>
        <input
          ref={searchInput}
          id={`${idPrefix}-lift-search`}
          type="search"
          role="combobox"
          aria-expanded={showResults}
          aria-controls={`${idPrefix}-lift-results`}
          aria-autocomplete="list"
          autoComplete="off"
          required
          value={query}
          placeholder="Start typing a lift…"
          onFocus={() => setShowResults(true)}
          onBlur={() => setShowResults(false)}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && showResults && filteredLifts[0]) {
              event.preventDefault();
              selectLift(filteredLifts[0]);
            }
          }}
          onInvalid={(event) => {
            if (!selectedLiftId) {
              event.currentTarget.setCustomValidity("Choose a lift from the search results.");
            }
          }}
          className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <input type="hidden" name="liftId" value={selectedLiftId} />
        {showResults && (
          <div
            id={`${idPrefix}-lift-results`}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border border-border bg-surface p-1 shadow-lg"
          >
            {filteredLifts.length > 0 ? (
              filteredLifts.map((lift) => (
                <button
                  key={lift.id}
                  type="button"
                  role="option"
                  aria-selected={lift.id === selectedLiftId}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => selectLift(lift)}
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-sm hover:bg-background"
                >
                  <span>
                    <span className="block font-medium">{lift.name}</span>
                    <span className="block text-xs text-muted">{lift.category.name}</span>
                  </span>
                  {lift.oneRepMax && (
                    <span className="shrink-0 text-xs text-muted">1RM {lift.oneRepMax} kg</span>
                  )}
                </button>
              ))
            ) : (
              <p className="px-2 py-3 text-sm text-muted">No matching lifts</p>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label htmlFor={`${idPrefix}-weight`} className="text-xs font-medium">
            Weight
          </label>
          {oneRepMax && (
            <span className="flex rounded border border-border p-0.5 text-[0.65rem]">
              <button
                type="button"
                onClick={() => setWeightMode("kg")}
                className={`rounded px-1.5 py-0.5 ${weightMode === "kg" ? "bg-accent font-semibold text-accent-foreground" : "text-muted"}`}
              >
                kg
              </button>
              <button
                type="button"
                onClick={choosePercentMode}
                className={`rounded px-1.5 py-0.5 ${weightMode === "percent" ? "bg-accent font-semibold text-accent-foreground" : "text-muted"}`}
              >
                % of 1RM
              </button>
            </span>
          )}
        </div>
        {weightMode === "percent" && oneRepMax ? (
          <div className="flex flex-col gap-1">
            <div className="relative">
              <input
                id={`${idPrefix}-weight`}
                type="number"
                min="1"
                max="100"
                step="0.5"
                required
                value={percent}
                onChange={(event) => setPercent(event.target.value)}
                className="w-full rounded border border-border bg-surface px-2 py-1.5 pr-7 text-sm outline-none focus:border-accent"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted">%</span>
            </div>
            <input type="hidden" name="weight" value={generatedWeight || ""} />
            <p className="text-[0.65rem] text-muted">
              {generatedWeight > 0
                ? `${percent}% of ${oneRepMax} kg = ${generatedWeight} kg`
                : `Based on a ${oneRepMax} kg 1RM`}
            </p>
          </div>
        ) : (
          <div className="relative">
            <input
              id={`${idPrefix}-weight`}
              name="weight"
              type="number"
              step="0.5"
              min="0"
              required
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 pr-8 text-sm outline-none focus:border-accent"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted">kg</span>
          </div>
        )}
      </div>
    </>
  );
}
