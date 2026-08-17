"use client";

import { relativeTime } from "@/lib/relativeTime";
import type { Question } from "@/lib/mock";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Blank on the server pass, relative once hydrated — "2 minutes ago" computed on the server
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
    <span className="italic">Anonymous</span>
  );
}

export function AnswerBlock({ answer }: { answer: string }) {
  return (
    <div className="mt-3 rounded-lg border-l-4 border-accent bg-accent-soft px-3 py-2.5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-accent">Answer</p>
      <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{answer}</p>
    </div>
  );
}

export default function QuestionCard({ q }: { q: Question }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <p className="whitespace-pre-wrap text-[1.0625rem] leading-relaxed">{q.body}</p>
      <p className="mt-2.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <Attribution author={q.author} />
        <span aria-hidden>·</span>
        <Timestamp iso={q.createdAt} />
      </p>
      {q.answer && <AnswerBlock answer={q.answer} />}
    </article>
  );
}
