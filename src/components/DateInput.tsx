"use client";

import { useEffect, useRef } from "react";

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * A date input defaulting to "today" — computed client-side after mount,
 * not server-rendered. A server-computed default (e.g. via
 * `toISOString().slice(0, 10)`) reflects the server process's timezone, not
 * the viewer's, so it can be off by a day for anyone far enough east or west
 * of the server. Rendering empty on the server and filling in the browser's
 * own local date on mount avoids that entirely.
 */
export function DateInput({
  name,
  id,
  required,
  className,
}: {
  name: string;
  id?: string;
  required?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current && !ref.current.value) {
      ref.current.value = localToday();
    }
  }, []);

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type="date"
      required={required}
      className={className}
    />
  );
}
