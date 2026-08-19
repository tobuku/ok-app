/** Format integer cents as dollar string, e.g. 35000 → "$350.00" */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format a date for display */
export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format time window, e.g. "9:00 AM - 12:00 PM" */
export function formatTimeWindow(
  start: Date | string | null,
  end: Date | string | null
): string {
  if (!start) return "";
  const s = typeof start === "string" ? new Date(start) : start;
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (!end) return fmt(s);
  const e = typeof end === "string" ? new Date(end) : end;
  return `${fmt(s)} - ${fmt(e)}`;
}
