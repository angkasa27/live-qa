import { describe, expect, it } from "vitest";
import { eventDate, relativeTime, daysUntil } from "./relativeTime.ts";

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
    // Pinned to WIB, so the clock time is asserted too: 09:05Z is 16:05 in Jakarta.
    expect(eventDate("2026-01-03T09:05:00Z")).toBe("Sat 3 Jan, 16:05");
  });
});

describe("daysUntil", () => {
  // 2026-09-05T10:00 in Jakarta (UTC+7) is 03:00Z the same day.
  const now = Date.parse("2026-09-05T03:00:00Z");

  it("counts calendar days, not 24-hour blocks", () => {
    // Later the same Jakarta day, and the next one, regardless of the hour.
    expect(daysUntil("2026-09-05T15:00:00Z", now)).toBe(0);
    expect(daysUntil("2026-09-06T01:00:00Z", now)).toBe(1);
  });

  it("is the same answer from either end of today", () => {
    const early = Date.parse("2026-09-04T22:00:00Z"); // 05:00 Jakarta, same day
    const late = Date.parse("2026-09-05T16:00:00Z"); // 23:00 Jakarta, same day
    expect(daysUntil("2026-09-12T02:00:00Z", early)).toBe(7);
    expect(daysUntil("2026-09-12T02:00:00Z", late)).toBe(7);
  });

  it("goes negative once the session is past", () => {
    expect(daysUntil("2026-09-01T02:00:00Z", now)).toBe(-4);
  });
});
