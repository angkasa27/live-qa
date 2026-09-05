"use client";

import { Clock, CornerDownLeft, Play, User, UserRoundX, Video } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useSeek } from "@/components/Player";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/relativeTime";
import { speakerShort, timecode, type Question } from "@/lib/types";
import { cn } from "@/lib/utils";

const noop = () => () => {};

/**
 * Blank on the server pass, relative once hydrated. "2 menit lalu" rendered on the server
 * would already be wrong by the time the client read it, and React would hydrate over it.
 */
function Timestamp({ iso }: { iso: string }) {
  const label = useSyncExternalStore(
    noop,
    () => relativeTime(iso),
    () => "",
  );
  return <time dateTime={iso}>{label}</time>;
}

/**
 * Who asked. Anonymity here is display only — it hides the name from the page and says
 * nothing about who actually submitted. The struck-through person icon carries "tanpa nama"
 * without the word having to.
 */
export function Attribution({ author }: { author: string | null }) {
  const Icon = author ? User : UserRoundX;
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 stroke-[1.9]" aria-hidden />
      {author ?? "Tanpa nama"}
    </span>
  );
}

/** Seeks the embedded player when one is on the page; otherwise opens YouTube at the mark. */
function ReplayControl({ youtubeId, at }: { youtubeId: string; at: number }) {
  const seek = useSeek();
  const label = (
    <>
      <Play className="fill-current stroke-none" aria-hidden />
      {timecode(at)}
    </>
  );

  if (seek) {
    return (
      <Button
        type="button"
        variant="outline"
        size="chip"
        className="mt-3.5 tabular-nums"
        onClick={() => seek(at)}
      >
        {label}
        <span className="sr-only">Putar rekaman di jawaban ini</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="chip"
      className="mt-3.5 tabular-nums"
      render={
        <a href={`https://youtu.be/${youtubeId}?t=${at}`} target="_blank" rel="noopener noreferrer" />
      }
    >
      {label}
      <span className="sr-only">Tonton jawabannya di YouTube</span>
    </Button>
  );
}

/**
 * An answer is marked by one green rule down its left edge and nothing else — no card, no
 * tinted panel, no "JAWABAN" label above it. On a page where content is flat, that rule is
 * enough to say "this is the reply", and it keeps a long answer readable instead of boxed.
 */
export function AnswerBlock({
  answer,
  speaker,
  replay,
  edited,
}: {
  answer: string;
  /** Named where we know it: "Ustadz Hafizh menjawab" reads better than a bare label. */
  speaker?: string;
  replay?: { youtubeId: string; at: number };
  /** Rewritten since first published. A flag only; the previous wording is an admin screen. */
  edited?: boolean;
}) {
  return (
    <div className="mt-3.5 border-l-[3px] border-primary pl-4">
      <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
        <CornerDownLeft className="size-3.5 shrink-0 stroke-2" aria-hidden />
        {speaker ? `${speakerShort(speaker)} menjawab` : "Jawaban"}
        {edited && <span className="font-normal text-faint">· direvisi</span>}
      </p>
      <p className="mt-1.5 text-md leading-[1.65] whitespace-pre-wrap text-foreground-soft">
        {answer}
      </p>
      {replay && <ReplayControl {...replay} />}
    </div>
  );
}

/**
 * One question, as a flat full-width band separated by a hairline. `mine` is the amber
 * exception: a question still in the queue is visible to the person who asked it and to
 * nobody else, so it reads as unfinished business rather than as part of the published list.
 */
export default function QuestionItem({
  q,
  speaker,
  youtubeId,
}: {
  q: Question;
  speaker?: string;
  youtubeId?: string;
}) {
  const replay = youtubeId && q.videoStart != null ? { youtubeId, at: q.videoStart } : undefined;
  const queued = q.status === "submitted";

  return (
    <article
      className={cn("border-t border-border-soft px-5 py-5", queued && "bg-warn-soft")}
    >
      {queued && (
        <p className="mb-2.5 flex items-center gap-2 text-sm font-bold text-warn">
          <Clock className="size-3.5 shrink-0 stroke-[2.2]" aria-hidden />
          Menunggu review admin
          <span className="font-normal text-warn/80">· hanya Anda yang melihat ini</span>
        </p>
      )}

      <p className="text-lg font-semibold tracking-[-0.01em] whitespace-pre-wrap">
        {q.body}
      </p>

      <p className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-faint">
        <Attribution author={q.author} />
        {q.source === "transcript" ? (
          <span className="flex items-center gap-1.5">
            <Video className="size-3.5 shrink-0 stroke-[1.9]" aria-hidden />
            dari rekaman
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0 stroke-[1.9]" aria-hidden />
            <Timestamp iso={q.createdAt} />
          </span>
        )}
      </p>

      {q.answer && (
        <AnswerBlock answer={q.answer} speaker={speaker} replay={replay} edited={q.edited} />
      )}
    </article>
  );
}
