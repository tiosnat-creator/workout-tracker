export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatWeight(weight: number) {
  return `${Number(weight.toFixed(1)).toString()} kg`;
}
