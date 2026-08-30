import "server-only";

import { MAX_BODY, type Proposal } from "./types.ts";

/**
 * Ask Gemini which of an event's unanswered questions the recording actually answers, and draft
 * the ones it does. See ROADMAP.md §7 for why this is a different problem from transcript
 * ingestion: the questions already exist, so this is matching against a known list rather than
 * discovering them in a caption stream.
 *
 * Gemini reads a public YouTube URL directly, which is the whole reason this runs as one HTTPS
 * call with no yt-dlp and no caption dependency. Unlisted and private videos are rejected by the
 * API; that surfaces as a thrown error, not an empty result.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
// Overridable because a congested model is a live outage for this button, and swapping to
// another 1M-context flash model should not need a redeploy.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";

// A talking head carries nothing in the frames, so low resolution costs ~100 tokens/sec instead
// of ~300 and stretches the 1M window from one hour of video to three.
const RESOLUTION = "low";

// Comfortably under the route's maxDuration, so a hung request fails as our error rather than
// the platform's.
const TIMEOUT_MS = 240_000;

// ponytail: no upper bound from the real video duration, which would cost a second API call.
// A majelis is never twelve hours; this only catches a model returning milliseconds or nonsense.
const MAX_VIDEO_SECONDS = 12 * 60 * 60;

export type { Proposal };

const PROMPT = `You are helping an admin at an Indonesian majelis ta'lim (Islamic study circle).

The video is a recording of one session. During it, a speaker (syaikh/ustadz) works through
questions submitted by the audience. Below is the list of questions that are still unanswered in
our records.

Do this in two steps, in order.

STEP 1 — DECIDE. For each numbered question, decide whether the speaker actually addresses it in
this recording. This is the important step.
- The speaker only gets through what time allows. It is completely normal and expected for MOST
  of this list to be unanswered. Returning "not_answered" for the majority is a correct result,
  not a failure.
- Never stretch a related or adjacent answer to cover a question the speaker did not take up.
  Sharing a topic is not the same as answering the question.
- Use "partly" when he takes the question up but does not fully answer it, or answers it together
  with another question rather than on its own.
- If you are unsure, return "not_answered".

STEP 2 — DRAFT. Only for questions you marked "answered" or "partly":
- "timestamp": where the ANSWER begins, written as M:SS or H:MM:SS (for example "13:38" or
  "1:04:20"). NOT where the question is read aloud: a viewer sent to the question has to sit
  through it again.
- "quote": a short line of what the speaker actually says as he takes this question up, so the
  admin can verify the match. Keep it under 20 words.
- "draft": a faithful summary of the ruling or point he makes. Answers run several minutes with
  digressions; the admin's card wants the substance, and the replay link carries anyone who wants
  the full thing. A few sentences.
- Write "draft" and "quote" in the language spoken in the recording. Do not translate.
- Summarise only what he actually says. Do not add your own religious rulings, evidences, or
  qualifications.

Questions:
`;

const SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          n: { type: "integer", description: "The question number from the list." },
          verdict: { type: "string", enum: ["answered", "partly", "not_answered"] },
          // A string, not an integer: an unbounded integer field lets constrained decoding run
          // away emitting digits, and one 600-digit number eats the output budget and truncates
          // the rest of the array. Clock format is also how the model natively reads video.
          timestamp: { type: "string", description: 'Where the answer begins, as M:SS or H:MM:SS.' },
          quote: { type: "string" },
          draft: { type: "string" },
        },
        required: ["n", "verdict"],
      },
    },
  },
  required: ["results"],
} as const;

/** Pull the model's text out of the interactions response. Shape per the May 2026 revision. */
function outputText(body: unknown): string {
  const steps = (body as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) throw new Error("Gemini: balasan tanpa steps.");
  for (const step of steps) {
    if (step?.type !== "model_output") continue;
    for (const part of step.content ?? []) {
      if (part?.type === "text" && typeof part.text === "string") return part.text;
    }
  }
  throw new Error("Gemini: balasan tanpa teks.");
}

export async function draftFromVideo(
  youtubeId: string,
  questions: { id: string; body: string }[],
): Promise<Proposal[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY belum diatur.");
  if (questions.length === 0) return [];

  // The model echoes a list index rather than a uuid: shorter to emit and far harder to garble,
  // and an out-of-range index is trivially detectable where a wrong uuid is not.
  const numbered = questions
    .map((q, i) => `${i + 1}. ${q.body.slice(0, MAX_BODY)}`)
    .join("\n");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
      // Pin the request/response shape this file parses rather than riding whatever the
      // endpoint's current default is.
      "Api-Revision": "2026-05-20",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      input: [
        { type: "text", text: PROMPT + numbered },
        { type: "video", uri: `https://www.youtube.com/watch?v=${youtubeId}`, resolution: RESOLUTION },
      ],
      response_format: { type: "text", mime_type: "application/json", schema: SCHEMA },
    }),
  });

  if (!res.ok) {
    // Carries the API's own reason through, which is what makes an unlisted-video rejection
    // diagnosable instead of looking like a generic outage.
    throw new Error(`Gemini menolak permintaan (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }

  return validate(outputText(await res.json()), questions);
}

/** "13:38" or "1:04:20" -> seconds. null for anything that isn't a plausible clock time. */
export function parseTimestamp(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const parts = raw.trim().split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^\d{1,2}$/.test(p))) return null;

  const [h, m, sec] = parts.length === 3 ? parts.map(Number) : [0, ...parts.map(Number)];
  if (m > 59 || sec > 59) return null;

  const total = h * 3600 + m * 60 + sec;
  return total >= 0 && total <= MAX_VIDEO_SECONDS ? total : null;
}

/**
 * Never trust the shape. A fabricated draft here becomes a ruling published under a real
 * scholar's name (ROADMAP.md §3), so anything that doesn't survive these checks is dropped
 * rather than repaired.
 */
export function validate(text: string, questions: { id: string }[]): Proposal[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini: balasan bukan JSON.");
  }

  const results = (parsed as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];

  const out: Proposal[] = [];
  const seen = new Set<number>();

  for (const r of results) {
    if (!r || typeof r !== "object") continue;
    const { n, verdict, timestamp, quote, draft } = r as Record<string, unknown>;

    if (verdict !== "answered" && verdict !== "partly") continue;
    if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > questions.length) continue;
    if (seen.has(n as number)) continue;
    if (typeof draft !== "string" || !draft.trim()) continue;
    if (typeof quote !== "string" || !quote.trim()) continue;

    const seconds = parseTimestamp(timestamp);
    if (seconds === null) continue;

    seen.add(n as number);
    out.push({
      id: questions[(n as number) - 1].id,
      verdict,
      draft: draft.trim(),
      videoStart: seconds,
      quote: quote.trim(),
    });
  }

  return out;
}
