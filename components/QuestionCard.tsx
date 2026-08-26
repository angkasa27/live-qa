"use client";

import { relativeTime } from "@/lib/relativeTime";
import { timecode, type Question } from "@/lib/types";
import { useSeek } from "@/components/Player";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Blank on the server pass, relative once hydrated; "2 minutes ago" computed on the server
 *  would never match the value the client computes a moment later. */
function Timestamp({ iso }: { iso: string }) {
  const label = useSyncExternalStore(
    noop,
    () => relativeTime(iso),
    () => "",
  );
  return <time dateTime={iso}>{label}</time>;
}

export function Attribution({ author }: { author: string | null }) {
  return author ? (
    <span className="font-medium text-foreground">{author}</span>
  ) : (
    <span className="italic">Anonim</span>
  );
}

const PILL =
  "flex min-h-[1.75rem] shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 text-xs font-semibold tabular-nums text-accent-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
);

/** Seeks the embedded player when one is on the page; otherwise opens YouTube at the mark. */
function ReplayControl({ youtubeId, at }: { youtubeId: string; at: number }) {
  const seek = useSeek();

  if (seek) {
    return (
      <button type="button" onClick={() => seek(at)} className={PILL}>
        <PlayIcon />
        {timecode(at)}
        <span className="sr-only">Putar video di jawaban ini</span>
      </button>
    );
  }

  return (
    <a
      href={`https://youtu.be/${youtubeId}?t=${at}`}
      target="_blank"
      rel="noopener noreferrer"
      className={PILL}
    >
      <PlayIcon />
      {timecode(at)}
      <span className="sr-only">Tonton jawabannya di YouTube</span>
    </a>
  );
}

export function AnswerBlock({
  answer,
  replay,
}: {
  answer: string;
  replay?: { youtubeId: string; at: number };
}) {
  return (
    <div className="mt-3 rounded-lg border-l-4 border-accent bg-accent-soft px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-accent">Jawaban</p>
        {replay && <ReplayControl {...replay} />}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{answer}</p>
    </div>
  );
}

export default function QuestionCard({ q, youtubeId }: { q: Question; youtubeId?: string }) {
  const replay =
    youtubeId && q.videoStart != null ? { youtubeId, at: q.videoStart } : undefined;

  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <p className="whitespace-pre-wrap text-[1.0625rem] leading-relaxed">{q.body}</p>
      <p className="mt-2.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <Attribution author={q.author} />
        <span aria-hidden>·</span>
        {q.source === "transcript" ? (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs">
            dari rekaman
          </span>
        ) : (
          <Timestamp iso={q.createdAt} />
        )}
        {/* Only ever set on questions this browser submitted; see lib/queries.ts. A student
            who submits into a moderation queue and sees nothing assumes it failed and submits
            again, so their own pending question stays visible to them alone. */}
        {q.status === "submitted" && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
            menunggu review
          </span>
        )}
      </p>
      {q.answer && <AnswerBlock answer={q.answer} replay={replay} />}
    </article>
  );
}
