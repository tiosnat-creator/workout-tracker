export function formatDate(date: Date) {
  // Date-only values (from <input type="date">) are stored as UTC midnight
  // for the picked calendar day (new Date("YYYY-MM-DD") is spec'd as UTC).
  // Pinning the display to UTC too keeps it matching what was picked,
  // regardless of the server process's own timezone.
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatWeight(weight: number) {
  return `${Number(weight.toFixed(1)).toString()} kg`;
}
