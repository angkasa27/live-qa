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

export function eventDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
