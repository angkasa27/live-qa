"use client";

import { CircleUserRound, Clock, CornerDownRight, Play, VenetianMask, Video } from "lucide-react";
import { relativeTime } from "@/lib/relativeTime";
import { timecode, type Question } from "@/lib/types";
import { useSeek } from "@/components/Player";
import { Badge } from "@/components/ui/badge";
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
    <span className="flex items-center gap-1 font-medium text-foreground">
      <CircleUserRound className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
      {author}
    </span>
  ) : (
    <span className="flex items-center gap-1 italic">
      <VenetianMask className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Anonim
    </span>
  );
}

const PILL =
  "flex min-h-[1.875rem] shrink-0 items-center gap-1.5 rounded-full bg-primary px-2.5 text-xs font-bold tabular-nums text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Seeks the embedded player when one is on the page; otherwise opens YouTube at the mark. */
function ReplayControl({ youtubeId, at }: { youtubeId: string; at: number }) {
  const seek = useSeek();

  if (seek) {
    return (
      <button type="button" onClick={() => seek(at)} className={PILL}>
        <Play className="h-3 w-3 fill-current" aria-hidden />
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
      <Play className="h-3 w-3 fill-current" aria-hidden />
      {timecode(at)}
      <span className="sr-only">Tonton jawabannya di YouTube</span>
    </a>
  );
}

export function AnswerBlock({
  answer,
  replay,
  edited,
}: {
  answer: string;
  replay?: { youtubeId: string; at: number };
  /** The answer has been rewritten since it was first published. A flag only: the previous
   *  wording is an admin screen, not something a student reads. See ROADMAP.md §3. */
  edited?: boolean;
}) {
  return (
    <div className="mt-3 rounded-r-[10px] border-l-[3px] border-primary bg-accent px-3 py-2.5">
      <div className="flex items-center justify-between gap-2.5">
        <p className="flex items-center gap-1.5 font-mono text-[0.625rem] font-medium tracking-[0.1em] text-primary uppercase">
          <CornerDownRight className="h-3 w-3" aria-hidden />
          Jawaban
          {edited && <span className="font-sans tracking-normal text-faint normal-case">· direvisi</span>}
        </p>
        {replay && <ReplayControl {...replay} />}
      </div>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap">{answer}</p>
    </div>
  );
}

export default function QuestionCard({ q, youtubeId }: { q: Question; youtubeId?: string }) {
  const replay =
    youtubeId && q.videoStart != null ? { youtubeId, at: q.videoStart } : undefined;

  return (
    <article
      className={`rounded-2xl border p-3.5 ${
        /* A question still in the queue is only ever visible to the person who asked it, and it
           reads as unfinished business rather than as part of the published list. */
        q.status === "submitted" ? "border-warn-border bg-warn-soft" : "border-border bg-card"
      }`}
    >
      {q.status === "submitted" && (
        <p className="mb-2.5 flex flex-wrap items-center gap-2">
          <Badge variant="warn" className="gap-1 px-2.5 text-[0.6875rem]">
            <Clock className="h-3 w-3" aria-hidden />
            Menunggu review
          </Badge>
          <span className="text-xs text-faint">hanya Anda yang melihat ini</span>
        </p>
      )}
      <p className="font-serif text-[1.0625rem] leading-relaxed whitespace-pre-wrap">{q.body}</p>
      <p className="mt-2.5 flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-faint">
        <Attribution author={q.author} />
        <span aria-hidden>·</span>
        {q.source === "transcript" ? (
          <Badge variant="outline" className="gap-1 text-[0.6875rem] normal-case tracking-normal">
            <Video className="h-3 w-3" aria-hidden />
            dari rekaman
          </Badge>
        ) : (
          <Timestamp iso={q.createdAt} />
        )}
      </p>
      {q.answer && <AnswerBlock answer={q.answer} replay={replay} edited={q.edited} />}
    </article>
  );
}
