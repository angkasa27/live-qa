// Shared shapes. See ROADMAP.md §4 — these mirror db/schema.sql and are what crosses the
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
  publicArchive: boolean;
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
  /** null = anonymous. Display attribution only — it says nothing about who actually asked. */
  author: string | null;
  createdAt: string;
  /** Present when the pair was extracted from a recording rather than asked live. */
  source?: "transcript";
  /** Seconds into the recording where the answer starts — the replay anchor. */
  videoStart?: number;
  /** Only ever true on questions returned to the browser that submitted them. */
  mine?: boolean;
};

export type Page = { items: Question[]; nextCursor: string | null };

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

export const MAX_BODY = 500;
export const PAGE_SIZE = 10;
