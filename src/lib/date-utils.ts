/**
 * Timezone-aware date utilities.
 * Uses Intl.DateTimeFormat to convert between org-local dates and UTC boundaries.
 * No external dependencies.
 */

/** Get the current "today" in the org's timezone, plus UTC boundaries for that day. */
export function getOrgToday(timezone: string): {
  todayStr: string;
  start: Date;
  end: Date;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA formats as YYYY-MM-DD
  const todayStr = formatter.format(now);
  return { todayStr, ...dateToDayBounds(todayStr, timezone) };
}

/** Given a YYYY-MM-DD string and timezone, return the UTC start and end of that calendar day. */
export function dateToDayBounds(
  dateStr: string,
  timezone: string
): { start: Date; end: Date } {
  // Parse the date parts
  const [year, month, day] = dateStr.split("-").map(Number);

  // Build a date string in the target timezone and find its UTC offset.
  // Create a date at midnight local by finding the UTC equivalent.
  // We use a binary-search-free approach: format a known UTC instant in the
  // target timezone, compute the offset, then apply it.

  // Approximate: start with midnight UTC on that date
  const approx = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

  // Get what date/time it is in the target timezone at that UTC instant
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(approx);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  const localAtApprox = new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  );

  // Offset in ms: how far ahead the timezone is from UTC
  const offsetMs = localAtApprox.getTime() - approx.getTime();

  // Midnight in the target timezone = midnight UTC minus the offset
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs);

  // End of day = start + 24h - 1ms
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

  return { start, end };
}
