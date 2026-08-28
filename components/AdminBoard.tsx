"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminList, setAnswer, setQuestionStatus } from "@/lib/actions";
import { relativeTime } from "@/lib/relativeTime";
import type { Question, QuestionStatus } from "@/lib/types";

const FILTERS = ["Menunggu review", "Belum dijawab", "Sudah dijawab", "Semua"] as const;
type Filter = (typeof FILTERS)[number];

function match(q: Question, filter: Filter) {
  switch (filter) {
    case "Menunggu review":
      return q.status === "submitted";
    case "Belum dijawab":
      return !q.answer && q.status !== "hidden";
    case "Sudah dijawab":
      return !!q.answer;
    default:
      return true;
  }
}

function Pill({ tone, children }: { tone: "warn" | "accent" | "plain"; children: React.ReactNode }) {
  const style = {
    warn: "border border-amber-500/40 bg-amber-500/10 text-amber-600",
    accent: "bg-accent-soft text-accent",
    plain: "border border-border text-muted",
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{children}</span>;
}

function Row({ q, onChange }: { q: Question; onChange: (next: Question) => void }) {
  const [draft, setDraft] = useState(q.answer ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = draft.trim() !== (q.answer ?? "");

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await setAnswer(q.id, draft);
      if (!res.ok) throw new Error(res.error);
      onChange(res.data);
    } catch {
      setDraft(q.answer ?? ""); // roll back to what the server still believes
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function moderate(status: QuestionStatus) {
    setBusy(true);
    const res = await setQuestionStatus(q.id, status);
    setBusy(false);
    if (res.ok) onChange({ ...q, status });
    else setError(res.error);
  }

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* Stacked on a phone: read the question, then write the answer. Side by side once there
          is room for both without either getting cramped. */}
      <div className="lg:flex lg:divide-x lg:divide-border">
        <div className="p-4 lg:w-1/2">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className="font-medium text-foreground">{q.author ?? "Anonim"}</span>
            <span aria-hidden>·</span>
            <span suppressHydrationWarning>{relativeTime(q.createdAt)}</span>
            {q.status === "submitted" && <Pill tone="warn">menunggu review</Pill>}
            {q.status === "hidden" && <Pill tone="plain">disembunyikan</Pill>}
            {q.answer && <Pill tone="accent">dijawab</Pill>}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[1.0625rem] leading-relaxed">{q.body}</p>
        </div>

        <div className="border-t border-border p-4 lg:w-1/2 lg:border-t-0">
          <label htmlFor={`a-${q.id}`} className="mb-2 block text-sm font-medium text-muted">
            Jawaban
            <span className="sr-only"> untuk: {q.body.slice(0, 60)}</span>
          </label>
          <textarea
            id={`a-${q.id}`}
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tulis jawaban yang disampaikan pemateri…"
            className="w-full resize-y rounded-lg border border-border bg-background p-3 leading-relaxed outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
        </div>
      </div>

      {/* One action bar per card, so the operator's thumb has a single place to go.
          Hiding is a human click and it is reversible. Nothing here deletes. See ROADMAP.md §6. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-background/40 px-4 py-3">
        {q.status !== "approved" && (
          <button
            onClick={() => moderate("approved")}
            disabled={busy}
            className="min-h-[2.5rem] rounded-lg border border-accent px-3 text-sm font-medium text-accent disabled:opacity-40"
          >
            Tampilkan
          </button>
        )}
        {q.status !== "hidden" && (
          <button
            onClick={() => moderate("hidden")}
            disabled={busy}
            className="min-h-[2.5rem] rounded-lg border border-border px-3 text-sm font-medium text-muted disabled:opacity-40"
          >
            Sembunyikan
          </button>
        )}
        {error && <span className="w-full text-sm text-red-500 sm:w-auto">{error}</span>}
        {/* Clearing the box retracts: the answer is withdrawn from display but kept in the
            row and in answer_revisions. The fix path has to be as fast as the write path. */}
        <button
          onClick={save}
          disabled={!dirty || busy}
          className="ml-auto min-h-[2.75rem] rounded-lg bg-accent px-5 text-sm font-semibold text-accent-fg transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {busy ? "Menyimpan…" : draft.trim() ? "Simpan jawaban" : "Tarik jawaban"}
        </button>
      </div>
    </li>
  );
}

export default function AdminBoard({ eventId }: { eventId: string }) {
  const [all, setAll] = useState<Question[]>([]);
  const [filter, setFilter] = useState<Filter>("Belum dijawab");

  const load = useCallback(() => {
    adminList(eventId).then(setAll);
  }, [eventId]);

  useEffect(() => {
    load();
    // Same 4s poll as the speaker deck, and for the same reason: this is an operator screen
    // during a live session, not one of the 5000 phones.
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  const replace = useCallback((next: Question) => {
    setAll((prev) => prev.map((q) => (q.id === next.id ? next : q)));
  }, []);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f, all.filter((q) => match(q, f)).length])) as Record<Filter, number>,
    [all],
  );

  const rows = useMemo(() => {
    const kept = all.filter((q) => match(q, filter));
    // Unanswered float up so the operator never hunts for work.
    return filter === "Semua" ? kept.sort((a, b) => Number(!!a.answer) - Number(!!b.answer)) : kept;
  }, [all, filter]);

  return (
    <>
      {/* Sticky under the 3.5rem nav bar, and it scrolls sideways instead of wrapping into a
          second row of chips on a narrow phone. */}
      <div className="sticky top-14 z-10 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`flex min-h-[2.5rem] shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
              filter === f
                ? "border-accent bg-accent text-accent-fg"
                : "border-border text-muted hover:border-accent hover:text-foreground"
            }`}
          >
            {f}
            <span className="tabular-nums opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted">
          Tidak ada apa-apa di sini.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((q) => (
            <Row key={q.id} q={q} onChange={replace} />
          ))}
        </ul>
      )}
    </>
  );
}
