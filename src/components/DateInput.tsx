"use client";

import { useEffect, useState } from "react";

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * A date input defaulting to "today". Renders a UTC-based guess on the
 * server (so the form still works without JS, or before hydration), then
 * corrects to the browser's own local date on mount — a server-computed
 * default can be a day off for anyone far enough east or west of the
 * server's timezone.
 *
 * Controlled (not just an imperative ref write to defaultValue), because
 * React resets uncontrolled fields to their defaultValue after a Server
 * Action completes; on a page that doesn't navigate away on submit
 * (add-another-entry forms), that emptied the field and blocked the next
 * submission behind `required`. Component state isn't touched by that
 * reset, so it survives repeated submits in the same session.
 */
export function DateInput({
  name,
  id,
  required,
  className,
  defaultValue,
}: {
  name: string;
  id?: string;
  required?: boolean;
  className?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(
    () => defaultValue ?? new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    // Correct the server's UTC guess after hydration for add-entry forms and
    // pick up a saved date when an edit form is refreshed in place.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(defaultValue ?? localToday());
  }, [defaultValue]);

  return (
    <input
      id={id}
      name={name}
      type="date"
      required={required}
      className={className}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
