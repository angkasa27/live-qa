"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CardSkeleton } from "@/components/Skeleton";
import Spinner from "@/components/Spinner";
import { adminList, draftAnswers, setAnswer, setQuestionStatus } from "@/lib/actions";
import { relativeTime } from "@/lib/relativeTime";
import { timecode, type Proposal, type Question, type QuestionStatus } from "@/lib/types";

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

/**
 * A draft proposed from the recording, offered rather than prefilled. Two reasons it is a card
 * and not text already in the box: machine-written text stays visibly distinct from the admin's
 * own, and the evidence (timestamp plus what the speaker actually said) sits where it can be
 * checked against the video before anyone accepts it. See ROADMAP.md §3 on why a wrong ruling
 * published under a real scholar's name is the failure this whole feature is shaped around.
 */
function ProposalCard({
  proposal,
  onUse,
  onDismiss,
}: {
  proposal: Proposal;
  onUse: () => void;
  onDismiss: () => void;
}) {
  const partly = proposal.verdict === "partly";
  return (
    <div
      className={`mb-3 rounded-lg border p-3 ${
        partly ? "border-amber-500/40 bg-amber-500/5" : "border-accent/40 bg-accent-soft/40"
      }`}
    >
      <p className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-medium text-foreground">Usulan dari rekaman</span>
        {partly && <Pill tone="warn">dijawab sebagian</Pill>}
        <span className="tabular-nums">{timecode(proposal.videoStart)}</span>
      </p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{proposal.draft}</p>
      <p className="mt-2 border-l-2 border-border pl-2 text-xs italic text-muted">
        “{proposal.quote}”
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onUse}
          className="min-h-[2.25rem] rounded-lg border border-accent px-3 text-sm font-medium text-accent"
        >
          Gunakan
        </button>
        <button
          onClick={onDismiss}
          className="min-h-[2.25rem] px-2 text-sm font-medium text-muted underline underline-offset-4"
        >
          Abaikan
        </button>
      </div>
    </div>
  );
}

function Row({
  q,
  suggestion,
  onChange,
}: {
  q: Question;
  suggestion?: Proposal;
  onChange: (next: Question) => void;
}) {
  const [draft, setDraft] = useState(q.answer ?? "");
  // Which button is working, so only that one shows a spinner while all of them lock.
  const [busy, setBusy] = useState<"answer" | "moderate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // Only set once the admin accepts a proposal, so an anchor is never written for text they
  // typed themselves.
  const [anchor, setAnchor] = useState<number | undefined>();

  const dirty = draft.trim() !== (q.answer ?? "");
  const offered = suggestion && !dismissed && !q.answer;

  async function save() {
    setBusy("answer");
    setError(null);
    try {
      const res = await setAnswer(q.id, draft, anchor);
      if (!res.ok) throw new Error(res.error);
      onChange(res.data);
    } catch {
      setDraft(q.answer ?? ""); // roll back to what the server still believes
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  async function moderate(status: QuestionStatus) {
    setBusy("moderate");
    const res = await setQuestionStatus(q.id, status);
    setBusy(null);
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
          {offered && (
            <ProposalCard
              proposal={suggestion}
              onUse={() => {
                setDraft(suggestion.draft);
                setAnchor(suggestion.videoStart);
                setDismissed(true);
              }}
              onDismiss={() => setDismissed(true)}
            />
          )}
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
            disabled={busy !== null}
            className="flex min-h-[2.5rem] items-center gap-2 rounded-lg border border-accent px-3 text-sm font-medium text-accent disabled:opacity-40"
          >
            {busy === "moderate" && <Spinner />}
            Tampilkan
          </button>
        )}
        {q.status !== "hidden" && (
          <button
            onClick={() => moderate("hidden")}
            disabled={busy !== null}
            className="flex min-h-[2.5rem] items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted disabled:opacity-40"
          >
            {busy === "moderate" && <Spinner />}
            Sembunyikan
          </button>
        )}
        {error && <span className="w-full text-sm text-red-500 sm:w-auto">{error}</span>}
        {/* Clearing the box retracts: the answer is withdrawn from display but kept in the
            row and in answer_revisions. The fix path has to be as fast as the write path. */}
        <button
          onClick={save}
          disabled={!dirty || busy !== null}
          className="ml-auto flex min-h-[2.75rem] items-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-accent-fg transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {busy === "answer" && <Spinner />}
          {busy === "answer" ? "Menyimpan…" : draft.trim() ? "Simpan jawaban" : "Tarik jawaban"}
        </button>
      </div>
    </li>
  );
}

export default function AdminBoard({ eventId, youtubeId }: { eventId: string; youtubeId?: string }) {
  const [all, setAll] = useState<Question[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>("Belum dijawab");
  // Proposals live here and nowhere else: nothing is persisted until an admin saves an answer.
  const [suggestions, setSuggestions] = useState<Record<string, Proposal>>({});
  const [drafting, setDrafting] = useState(false);
  const [draftNote, setDraftNote] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    adminList(eventId).then((qs) => {
      setAll(qs);
      setLoaded(true);
    });
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

  async function draft() {
    setDrafting(true);
    setDraftNote(null);
    const res = await draftAnswers(eventId);
    setDrafting(false);

    if (!res.ok) {
      setDraftNote({ tone: "error", text: res.error });
      return;
    }
    // The speaker only gets through what time allows, so a handful of matches out of a long
    // queue is the ordinary result. Report it as a count, not as a failure.
    const found = Object.keys(res.data).length;
    const checked = all.filter((q) => !q.answer && q.status !== "hidden").length;
    setSuggestions(res.data);
    setDraftNote({
      tone: "info",
      text: found
        ? `${found} dari ${checked} pertanyaan dijawab di rekaman.`
        : "Tidak ada pertanyaan ini yang dijawab di rekaman.",
    });
  }

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
            {loaded && <span className="tabular-nums opacity-70">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {/* Outside the sticky strip on purpose: this is a once-per-session action, and it would
          scroll out of reach inside a horizontally scrolling row of chips. */}
      {youtubeId && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            onClick={draft}
            disabled={drafting}
            className="flex min-h-[2.5rem] items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted transition-colors disabled:opacity-40 hover:border-accent hover:text-foreground"
          >
            {drafting && <Spinner />}
            {drafting ? "Membaca rekaman…" : "Ambil jawaban dari rekaman"}
          </button>
          {draftNote && (
            <span className={`text-sm ${draftNote.tone === "error" ? "text-red-500" : "text-muted"}`}>
              {draftNote.text}
            </span>
          )}
        </div>
      )}

      {!loaded ? (
        <CardSkeleton count={4} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted">
          Tidak ada apa-apa di sini.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((q) => (
            <Row key={q.id} q={q} suggestion={suggestions[q.id]} onChange={replace} />
          ))}
        </ul>
      )}
    </>
  );
}
