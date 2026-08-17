"use client";

import { useMemo, useState } from "react";
import { relativeTime } from "@/lib/relativeTime";
import type { Question } from "@/lib/mock";
import { useQa } from "@/lib/store";

const FILTERS = ["Unanswered", "Answered", "All"] as const;
type Filter = (typeof FILTERS)[number];

function Row({ q }: { q: Question }) {
  const { setAnswer } = useQa();
  const [draft, setDraft] = useState(q.answer ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = draft.trim() !== (q.answer ?? "");

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await setAnswer(q.id, draft);
    } catch {
      setDraft(q.answer ?? ""); // roll back to what the server still believes
      setError("Save failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-border bg-surface p-4 lg:flex lg:gap-6">
      <div className="lg:flex-1">
        <p className="whitespace-pre-wrap text-[1.0625rem] leading-relaxed">{q.body}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span>{q.author ?? "Anonymous"}</span>
          <span aria-hidden>·</span>
          <span suppressHydrationWarning>{relativeTime(q.createdAt)}</span>
          {q.answer && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              answered
            </span>
          )}
        </p>
      </div>

      <div className="mt-3 lg:mt-0 lg:w-[45%] lg:shrink-0">
        <label htmlFor={`a-${q.id}`} className="sr-only">
          Answer for: {q.body.slice(0, 60)}
        </label>
        <textarea
          id={`a-${q.id}`}
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type what the speaker answered…"
          className="w-full resize-y rounded-lg border border-border bg-background p-3 leading-relaxed outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
        <div className="mt-2 flex items-center justify-end gap-3">
          {error && <span className="mr-auto text-sm text-red-500">{error}</span>}
          <button
            onClick={save}
            disabled={!dirty || busy}
            className="min-h-[2.75rem] rounded-lg bg-accent px-5 text-sm font-semibold text-accent-fg transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {busy ? "Saving…" : "Save answer"}
          </button>
        </div>
      </div>
    </li>
  );
}

export default function AdminBoard({ eventId }: { eventId: string }) {
  const { all } = useQa();
  const [filter, setFilter] = useState<Filter>("Unanswered");

  const rows = useMemo(() => {
    const mine = all.filter((q) => q.eventId === eventId);
    const byFilter =
      filter === "All" ? mine : mine.filter((q) => (filter === "Answered" ? q.answer : !q.answer));
    // Unanswered float up in the "All" view so the operator never hunts for work.
    return filter === "All"
      ? [...byFilter].sort((a, b) => Number(!!a.answer) - Number(!!b.answer))
      : byFilter;
  }, [all, eventId, filter]);

  const pending = all.filter((q) => q.eventId === eventId && !q.answer).length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`min-h-[2.5rem] rounded-full border px-4 text-sm font-medium transition-colors ${
              filter === f
                ? "border-accent bg-accent text-accent-fg"
                : "border-border text-muted hover:border-accent hover:text-foreground"
            }`}
          >
            {f}
            {f === "Unanswered" && pending > 0 && <span className="ml-1.5 tabular-nums">{pending}</span>}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted">
          Nothing here.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((q) => (
            <Row key={q.id} q={q} />
          ))}
        </ul>
      )}
    </>
  );
}
