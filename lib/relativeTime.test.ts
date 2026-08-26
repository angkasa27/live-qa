import { describe, expect, it } from "vitest";
import { eventDate, relativeTime } from "./relativeTime.ts";

const NOW = Date.parse("2026-08-26T12:00:00Z");

describe("relativeTime", () => {
  it("is deterministic given now", () => {
    expect(relativeTime("2026-08-26T11:59:40Z", NOW)).toBe("just now");
    expect(relativeTime("2026-08-26T11:57:00Z", NOW)).toBe("3 minutes ago");
    expect(relativeTime("2026-08-26T10:00:00Z", NOW)).toBe("2 hours ago");
    expect(relativeTime("2026-08-24T12:00:00Z", NOW)).toBe("2 days ago");
  });

  it("handles the future too", () => {
    expect(relativeTime("2026-08-26T12:03:00Z", NOW)).toBe("in 3 minutes");
  });
});

describe("eventDate", () => {
  it("formats weekday, day, month and clock time", () => {
    // Time-of-day depends on the machine's timezone, so only the shape is asserted.
    expect(eventDate("2026-01-03T09:05:00Z")).toMatch(/^Sat 3 Jan, \d{2}:\d{2}$/);
  });
});
