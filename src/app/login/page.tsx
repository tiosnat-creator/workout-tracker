"use client";

import { useActionState } from "react";
import { authenticate } from "@/lib/auth-actions";

export default function LoginPage() {
  const [errorMessage, formAction, pending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="mb-1 text-xl font-bold tracking-tight uppercase">
        Lifting Log
      </h1>
      <p className="mb-6 text-sm text-muted">Sign in to your tracker.</p>
      <form action={formAction} className="flex flex-col gap-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        {errorMessage && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
