"use client";

import { useState } from "react";
import { createSession } from "@/lib/actions";
import { DateInput } from "@/components/DateInput";
import { WodFields } from "@/components/WodFields";
import { SaveButton } from "@/components/SaveButton";

export function SessionForm() {
  const [type, setType] = useState("OLYMPIC_LIFTING");
  return (
    <form action={createSession} className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Session type</legend>
        <div className="grid grid-cols-2 gap-2">
          {[["OLYMPIC_LIFTING", "Olympic Lifting"], ["WOD", "WOD"]].map(([value, label]) => (
            <label key={value} className={`flex cursor-pointer items-center gap-2 rounded border p-3 text-sm ${type === value ? "border-accent bg-surface" : "border-border"}`}>
              <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="date" className="mb-1 block text-sm font-medium">Date</label>
        <DateInput id="date" name="date" required className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
      </div>
      <div hidden={type !== "WOD"}>
        <fieldset disabled={type !== "WOD"} className="flex flex-col gap-4"><WodFields /></fieldset>
      </div>
      <div>
        <label htmlFor="planNotes" className="mb-1 block text-sm font-medium">Plan notes (optional)</label>
        <textarea id="planNotes" name="planNotes" rows={3} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
      </div>
      <SaveButton label="Create plan" />
    </form>
  );
}
