"use client";

import { useActionState } from "react";
import { completeSignup } from "@/lib/signup-actions";
import type { ProfileState } from "@/lib/signup-profile";

const initialState: ProfileState = { values: { username: "", gender: "", weight: "" } };
const fieldClass = "w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

export function ProfileForm() {
  const [state, action, pending] = useActionState(completeSignup, initialState);
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium">Username</label>
        <input id="username" name="username" autoComplete="nickname" minLength={3} maxLength={30} required defaultValue={state.values.username} aria-describedby="username-help" className={fieldClass} />
        <p id="username-help" className="mt-1 text-xs text-muted">3–30 characters. This is your display name; you’ll log in with email.</p>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Gender</legend>
        <div className="flex gap-3">
          {([['MALE', 'Male'], ['FEMALE', 'Female']] as const).map(([value, label]) => (
            <label key={value} className="flex flex-1 cursor-pointer items-center gap-2 rounded border border-border bg-surface px-3 py-3 text-sm">
              <input type="radio" name="gender" value={value} required defaultChecked={state.values.gender === value} className="accent-accent" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="weight" className="mb-1 block text-sm font-medium">Weight (kg)</label>
        <input id="weight" name="weight" type="number" inputMode="decimal" min="0.1" max="1000" step="0.1" required defaultValue={state.values.weight} aria-describedby="weight-help" className={fieldClass} />
        <p id="weight-help" className="mt-1 text-xs text-muted">We’ll save this as your first body weight entry.</p>
      </div>
      <button type="submit" disabled={pending} className="rounded bg-accent px-3 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60">
        {pending ? "Saving your profile…" : "Finish sign up"}
      </button>
    </form>
  );
}
