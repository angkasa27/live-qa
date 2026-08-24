"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminList, setAnswer, setQuestionStatus } from "@/lib/actions";
import { relativeTime } from "@/lib/relativeTime";
import type { Question, QuestionStatus } from "@/lib/types";

const FILTERS = ["Menunggu review", "Belum dijawab", "Sudah dijawab", "Semua"] as const;
type Filter = (typeof FILTERS)[number];

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
    <li className="rounded-xl border border-border bg-surface p-4 lg:flex lg:gap-6">
      <div className="lg:flex-1">
        <p className="whitespace-pre-wrap text-[1.0625rem] leading-relaxed">{q.body}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span>{q.author ?? "Anonim"}</span>
          <span aria-hidden>·</span>
          <span suppressHydrationWarning>{relativeTime(q.createdAt)}</span>
          {q.status === "submitted" && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
              menunggu review
            </span>
          )}
          {q.status === "hidden" && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">disembunyikan</span>
          )}
          {q.answer && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              dijawab
            </span>
          )}
        </p>

        {/* Hiding is a human click and it is reversible. Nothing here deletes — ROADMAP.md §6. */}
        <div className="mt-3 flex flex-wrap gap-2">
          {q.status !== "approved" && (
            <button
              onClick={() => moderate("approved")}
              disabled={busy}
              className="min-h-[2.25rem] rounded-lg border border-accent px-3 text-sm font-medium text-accent disabled:opacity-40"
            >
              Tampilkan
            </button>
          )}
          {q.status !== "hidden" && (
            <button
              onClick={() => moderate("hidden")}
              disabled={busy}
              className="min-h-[2.25rem] rounded-lg border border-border px-3 text-sm font-medium text-muted disabled:opacity-40"
            >
              Sembunyikan
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 lg:mt-0 lg:w-[45%] lg:shrink-0">
        <label htmlFor={`a-${q.id}`} className="sr-only">
          Jawaban untuk: {q.body.slice(0, 60)}
        </label>
        <textarea
          id={`a-${q.id}`}
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tulis jawaban yang disampaikan pemateri…"
          className="w-full resize-y rounded-lg border border-border bg-background p-3 leading-relaxed outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
        <div className="mt-2 flex items-center justify-end gap-3">
          {error && <span className="mr-auto text-sm text-red-500">{error}</span>}
          {/* Clearing the box retracts: the answer is withdrawn from display but kept in the
              row and in answer_revisions. The fix path has to be as fast as the write path. */}
          <button
            onClick={save}
            disabled={!dirty || busy}
            className="min-h-[2.75rem] rounded-lg bg-accent px-5 text-sm font-semibold text-accent-fg transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {busy ? "Menyimpan…" : draft.trim() ? "Simpan jawaban" : "Tarik jawaban"}
          </button>
        </div>
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

  const pending = all.filter((q) => q.status === "submitted").length;

  const rows = useMemo(() => {
    switch (filter) {
      case "Menunggu review":
        return all.filter((q) => q.status === "submitted");
      case "Belum dijawab":
        return all.filter((q) => !q.answer && q.status !== "hidden");
      case "Sudah dijawab":
        return all.filter((q) => q.answer);
      default:
        // Unanswered float up so the operator never hunts for work.
        return [...all].sort((a, b) => Number(!!a.answer) - Number(!!b.answer));
    }
  }, [all, filter]);

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
            {f === "Menunggu review" && pending > 0 && (
              <span className="ml-1.5 tabular-nums">{pending}</span>
            )}
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
