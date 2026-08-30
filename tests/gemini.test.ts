import { describe, expect, it } from "vitest";
import { parseTimestamp, validate } from "../lib/gemini.ts";

// The model's output is the one place a fabricated ruling could get as far as an admin's screen,
// so validate() is the guard and it gets tested on what it rejects, not on the happy path alone.

const questions = [{ id: "q-1" }, { id: "q-2" }, { id: "q-3" }];

const ok = (over: Record<string, unknown> = {}) => ({
  n: 1,
  verdict: "answered",
  timestamp: "15:30",
  quote: "Pertanyaan berikutnya dari ibu di Jakarta",
  draft: "Beliau menjelaskan bahwa hukumnya boleh dengan syarat tertentu.",
  ...over,
});

const run = (results: unknown[]) => validate(JSON.stringify({ results }), questions);

describe("validate", () => {
  it("maps a good proposal onto the question id its index points at", () => {
    expect(run([ok({ n: 2 })])).toEqual([
      {
        id: "q-2",
        verdict: "answered",
        videoStart: 930,
        quote: "Pertanyaan berikutnya dari ibu di Jakarta",
        draft: "Beliau menjelaskan bahwa hukumnya boleh dengan syarat tertentu.",
      },
    ]);
  });

  it("keeps partly, which is a weaker match and not a rejection", () => {
    expect(run([ok({ verdict: "partly" })])[0]?.verdict).toBe("partly");
  });

  it("drops questions the recording did not answer", () => {
    // The expected case: the speaker gets through what time allows.
    expect(run([ok({ verdict: "not_answered" }), ok({ n: 2, verdict: "not_answered" })])).toEqual([]);
  });

  it("returns an empty array, not an error, when nothing matched at all", () => {
    expect(run([])).toEqual([]);
    expect(validate(JSON.stringify({}), questions)).toEqual([]);
  });

  it("drops an index that points at no question", () => {
    expect(run([ok({ n: 0 }), ok({ n: 4 }), ok({ n: 1.5 }), ok({ n: "1" })])).toEqual([]);
  });

  it("keeps only the first proposal for a repeated index", () => {
    const out = run([ok({ draft: "pertama" }), ok({ draft: "kedua" })]);
    expect(out).toHaveLength(1);
    expect(out[0].draft).toBe("pertama");
  });

  it("drops a proposal with no draft or no supporting quote", () => {
    expect(run([ok({ draft: "   " }), ok({ n: 2, quote: "" }), ok({ n: 3, draft: null })])).toEqual([]);
  });

  it("drops an unparseable or out-of-range timestamp", () => {
    expect(
      run([ok({ timestamp: "930" }), ok({ n: 2, timestamp: "" }), ok({ n: 3, timestamp: 930 })]),
    ).toEqual([]);
  });

  // The bug this schema is shaped around: an unbounded integer field let constrained decoding
  // run away emitting digits, and one 600-digit number truncated the whole rest of the array.
  it("drops a runaway number where a clock time belongs", () => {
    expect(run([ok({ timestamp: "3".padEnd(400, "0") })])).toEqual([]);
    expect(run([ok({ timestamp: 3.2e600 })])).toEqual([]);
  });

  it("survives junk entries without losing the good ones", () => {
    expect(run([null, "nope", { n: 3 }, ok({ n: 2 })]).map((p) => p.id)).toEqual(["q-2"]);
  });

  it("throws when the reply is not JSON at all", () => {
    expect(() => validate("maaf, saya tidak bisa", questions)).toThrow();
  });
});

describe("parseTimestamp", () => {
  it("reads both clock formats the prompt asks for", () => {
    expect(parseTimestamp("0:08")).toBe(8);
    expect(parseTimestamp("13:38")).toBe(818);
    expect(parseTimestamp("1:04:20")).toBe(3860);
    expect(parseTimestamp(" 23:53 ")).toBe(1433);
  });

  it("rejects anything that is not a plausible clock time", () => {
    for (const bad of ["", "930", "12", "1:2:3:4", "-1:00", "12:60", "1:99:00", "abc", 930, null]) {
      expect(parseTimestamp(bad)).toBeNull();
    }
  });
});
