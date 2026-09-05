const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "3 minutes ago" / "just now". Pass `now` to keep it deterministic in tests. */
export function relativeTime(iso: string, now = Date.now()) {
  const secs = Math.round((Date.parse(iso) - now) / 1000);
  const unit = UNITS.find(([, s]) => Math.abs(secs) >= s);
  return unit ? RTF.format(Math.round(secs / unit[1]), unit[0]) : "just now";
}

/**
 * Every session time is the majelis' wall clock, not the reader's and not the server's.
 * Left unpinned this rendered three different strings for one instant: UTC on a server
 * pass, the visitor's zone on a client navigation, and the admin's zone in the edit form.
 */
export const EVENT_TZ = "Asia/Jakarta";

export function eventDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: EVENT_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Whole days from now until `iso`, in the majelis' own timezone — 0 once the day has
 * arrived, negative once it is past. Calendar days, not 24-hour blocks: a session tomorrow
 * at 08.00 is "1 hari" whether you ask at 07.00 or at 23.00 today, which is what an
 * operator scanning a list means by it.
 *
 * Pass `now` to keep it deterministic in tests.
 */
export function daysUntil(iso: string, now = Date.now()) {
  const dayIn = (ms: number) =>
    new Date(ms).toLocaleDateString("en-CA", { timeZone: EVENT_TZ });
  const start = Date.parse(dayIn(now) + "T00:00:00Z");
  const target = Date.parse(dayIn(Date.parse(iso)) + "T00:00:00Z");
  return Math.round((target - start) / 86_400_000);
}
