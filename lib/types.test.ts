import { describe, expect, it } from "vitest";
import { coverFor, isoToLocal, MAX_BODY, parseVideoId, slugDraft, slugify, timecode } from "./types.ts";

describe("isoToLocal", () => {
  it("round-trips through the picker without shifting the instant", () => {
    const iso = "2026-09-06T02:00:00.000Z";
    const local = isoToLocal(iso);
    // What the picker shows is local time, so it only equals the UTC string at offset zero.
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // The round trip the edit form performs: parse the local string back to an instant.
    expect(new Date(local).toISOString()).toBe(iso);
  });

  it("is empty for an unparseable date rather than throwing", () => {
    expect(isoToLocal("besok")).toBe("");
  });
});

describe("parseVideoId", () => {
  it("accepts a watch url, a youtu.be link, a live link, and a bare id", () => {
    expect(parseVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseVideoId("https://youtube.com/watch?v=dQw4w9WgXcQ&t=90")).toBe("dQw4w9WgXcQ");
    expect(parseVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseVideoId("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseVideoId("https://youtu.be/dQw4w9WgXcQ?t=30")).toBe("dQw4w9WgXcQ");
    expect(parseVideoId("https://www.youtube.com/live/dQw4w9WgXcQ?feature=share")).toBe("dQw4w9WgXcQ");
    expect(parseVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseVideoId("  dQw4w9WgXcQ  ")).toBe("dQw4w9WgXcQ");
    // Share sheets hand over a link with no scheme, and the admin form promises these work.
    expect(parseVideoId("youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseVideoId("www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseVideoId("youtube.com/live/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for anything that is not a youtube video id", () => {
    expect(parseVideoId("")).toBeNull();
    expect(parseVideoId("   ")).toBeNull();
    expect(parseVideoId("short")).toBeNull();
    expect(parseVideoId("way-too-long-to-be-an-id")).toBeNull();
    expect(parseVideoId("not a url at all")).toBeNull();
    // Assuming https must not turn any other host into a match.
    expect(parseVideoId("example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    // Non-youtube hosts are rejected, even when shaped like a youtube link.
    expect(parseVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    // A playlist or channel link has no video id in it.
    expect(parseVideoId("https://www.youtube.com/playlist?list=PL1234567890")).toBeNull();
    expect(parseVideoId("https://www.youtube.com/@kajian")).toBeNull();
  });
});

describe("slugDraft", () => {
  it("keeps the trailing hyphen so a second word can be typed", () => {
    expect(slugDraft("Kajian ")).toBe("kajian-");
    expect(slugDraft("Kajian Ahad")).toBe("kajian-ahad");
    expect(slugDraft("--kajian")).toBe("kajian");
  });
});

describe("slugify", () => {
  it("slugs names for use in urls", () => {
    expect(slugify("Kajian Ahad Pagi")).toBe("kajian-ahad-pagi");
    expect(slugify("Kajian & Tausiyah!")).toBe("kajian-tausiyah");
    expect(slugify("  --Kajian--  ")).toBe("kajian");
    expect(slugify("")).toBe("");
  });

  it("caps length at 48 characters", () => {
    expect(slugify("a".repeat(60)).length).toBe(48);
  });
});

describe("timecode", () => {
  it("renders mm:ss, adding hours only when needed", () => {
    expect(timecode(0)).toBe("0:00");
    expect(timecode(65)).toBe("1:05");
    expect(timecode(600)).toBe("10:00");
    expect(timecode(2760)).toBe("46:00");
    expect(timecode(3600)).toBe("1:00:00");
    expect(timecode(3675)).toBe("1:01:15");
  });
});

describe("coverFor", () => {
  const base = {
    id: "e",
    name: "n",
    startsAt: "2026-01-01T00:00:00Z",
    venue: "v",
    speaker: "s",
    status: "live" as const,
    acceptingQuestions: true,
    moderation: "auto" as const,
    hidden: false,
  };

  it("prefers the explicit image, then youtube still, then nothing", () => {
    expect(coverFor(base)).toBeNull();
    expect(coverFor({ ...base, youtubeId: "dQw4w9WgXcQ" }))
      .toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(coverFor({ ...base, youtubeId: "dQw4w9WgXcQ", image: "/x.jpg" })).toBe("/x.jpg");
  });
});

it("MAX_BODY matches the db check (500)", () => {
  expect(MAX_BODY).toBe(500);
});
