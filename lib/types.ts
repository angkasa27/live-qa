// Shared shapes. See ROADMAP.md §4; these mirror db/schema.sql and are what crosses the
// server/client boundary, which is why `contact`, `askerToken` and `ipHash` are absent: they
// exist in the table and never leave the server.

export type EventStatus = "scheduled" | "live" | "archived";

export type Event = {
  id: string;
  name: string;
  startsAt: string;
  venue: string;
  speaker: string;
  status: EventStatus;
  /** Resolved server-side from `coalesce(accepting_questions, status = 'live')`. */
  acceptingQuestions: boolean;
  moderation: "auto" | "manual";
  /**
   * Hidden from the public entirely: not listed, and 404 at its own URL for anyone but an admin.
   * Its own axis rather than a fourth `status`, so un-hiding restores the lifecycle state the
   * event already had. See db/schema.sql.
   */
  hidden: boolean;
  image?: string;
  youtubeId?: string;
};

export type QuestionStatus = "submitted" | "approved" | "hidden";

export type Question = {
  id: string;
  eventId: string;
  body: string;
  status: QuestionStatus;
  answer: string | null;
  retracted: boolean;
  /** null = anonymous. Display attribution only; it says nothing about who actually asked. */
  author: string | null;
  createdAt: string;
  /** Present when the pair was extracted from a recording rather than asked live. */
  source?: "transcript";
  /** Seconds into the recording where the answer starts, the replay anchor. */
  videoStart?: number;
  /** Only ever true on questions returned to the browser that submitted them. */
  mine?: boolean;
  /**
   * The answer has been rewritten at least once. A flag, never the revisions themselves: the
   * public is told the text moved, the history is an admin screen. See ROADMAP.md §3.
   */
  edited?: boolean;
};

/** One saved version of an answer. Admin only; `answer_revisions` never reaches the public. */
export type Revision = {
  answer: string | null;
  retracted: boolean;
  editedBy: string | null;
  createdAt: string;
};

export type Page = { items: Question[]; nextCursor: string | null };

/**
 * A draft answer proposed from the event's own recording, before any human accepts it. Held in
 * admin client state and never persisted: what gets stored is whatever the admin saves.
 * `quote` and `videoStart` are the evidence that the match is real, not decoration.
 */
export type Proposal = {
  id: string;
  /** "partly" = taken up but not fully answered, or answered together with another question. */
  verdict: "answered" | "partly";
  draft: string;
  /** Seconds into the recording where the ANSWER begins. */
  videoStart: number;
  quote: string;
};

/** List thumbnail: explicit cover wins, otherwise YouTube's own still, otherwise nothing. */
export function coverFor(e: Event) {
  return e.image ?? (e.youtubeId ? `https://i.ytimg.com/vi/${e.youtubeId}/hqdefault.jpg` : null);
}

/** 2760 → "46:00". Hours only appear when the recording is long enough to need them. */
export function timecode(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** Only YouTube counts: a bare id, a youtu.be link, or youtube.com's /watch?v= or /live/<id>. */
export function parseVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^(www|m|music)\./, "");
    if (host !== "youtube.com" && host !== "youtu.be") return null;
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : url.pathname.startsWith("/live/")
          ? url.pathname.slice("/live/".length)
          : (url.searchParams.get("v") ?? "");
    return /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * An instant → the "YYYY-MM-DDTHH:mm" **local** time `<input type="datetime-local">` wants.
 * toISOString() alone would hand the picker UTC and silently shift every event by the offset.
 * Seconds are dropped because the picker has no place to put them.
 */
export function isoToLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset(), 0, 0);
  return d.toISOString().slice(0, 16);
}

/** "Kajian Ahad Pagi" → "kajian-ahad-pagi". Ids are in URLs, so they stay readable. */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export const MAX_BODY = 500;
export const PAGE_SIZE = 10;
