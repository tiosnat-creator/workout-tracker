"use client";

import { useFormStatus } from "react-dom";

export function SaveButton({ label, name, value }: { label: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" name={name} value={value} disabled={pending} className="rounded bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50">{pending ? "Saving…" : label}</button>;
}
