"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock,
  CornerDownLeft,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Sparkles,
  Undo2,
} from "lucide-react";

import Clamp from "@/components/admin/Clamp";
import Confirm from "@/components/admin/Confirm";
import { Attribution } from "@/components/QuestionItem";
import RevisionsDialog from "@/components/RevisionsDialog";
import { CardSkeleton } from "@/components/Skeleton";
import Spinner from "@/components/Spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Textarea } from "@/components/ui/textarea";
import { adminList, draftAnswers, setAnswer, setQuestionStatus } from "@/lib/actions";
import { relativeTime } from "@/lib/relativeTime";
import { timecode, type Proposal, type Question, type QuestionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The queue is one list, sectioned by what each question needs from you — never filtered.
 *
 * This replaced five filter chips. Filtering hides work: an operator mid-majelis had to
 * remember which chip they were behind, the counts moved under them as questions arrived,
 * and "Semua" was the only view that told the truth. Sections say the same thing without
 * the memory: what needs a decision, what needs writing, what is finished, what was
 * rejected — in that order, counted, with the settled ones folded shut.
 */
const SECTIONS = [
  {
    key: "review",
    title: "Perlu review",
    icon: Clock,
    tone: "warn",
    openByDefault: true,
    match: (q: Question) => q.status === "submitted",
  },
  {
    key: "unanswered",
    title: "Belum dijawab",
    icon: Pencil,
    tone: "plain",
    openByDefault: true,
    match: (q: Question) => q.status === "approved" && !q.answer,
  },
  {
    key: "answered",
    title: "Sudah dijawab",
    icon: Check,
    tone: "ok",
    openByDefault: false,
    match: (q: Question) => q.status === "approved" && !!q.answer,
  },
  {
    key: "hidden",
    title: "Ditolak",
    icon: EyeOff,
    tone: "plain",
    openByDefault: false,
    match: (q: Question) => q.status === "hidden",
  },
] as const;

/**
 * A draft proposed from the recording, offered rather than prefilled. Two reasons it is a
 * card and not text already in the box: machine-written text stays visibly distinct from the
 * admin's own, and the evidence (timestamp plus what the speaker actually said) sits where it
 * can be checked against the video before anyone accepts it. See ROADMAP.md §3 on why a wrong
 * ruling published under a real scholar's name is the failure this feature is shaped around.
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
      className={cn(
        "mt-3 rounded-sm border p-3",
        partly ? "border-warn-border bg-warn-soft" : "border-accent-border bg-accent"
      )}
    >
      <p className="flex flex-wrap items-center gap-2 text-2xs font-bold text-primary">
        <Sparkles className="size-3.5 stroke-2" aria-hidden />
        Usulan dari rekaman
        {partly && (
          <Badge variant="warning" className="font-bold">
            dijawab sebagian
          </Badge>
        )}
        <span className="ml-auto font-semibold tabular-nums text-muted-foreground">
          {timecode(proposal.videoStart)}
        </span>
      </p>
      <p className="mt-2 text-md leading-relaxed whitespace-pre-wrap">{proposal.draft}</p>
      <p className="mt-2 border-l-2 border-accent-border pl-2.5 text-sm leading-snug italic text-muted-foreground">
        “{proposal.quote}”
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" className="flex-1" onClick={onUse}>
          <Check aria-hidden />
          Gunakan
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Abaikan
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  q,
  suggestion,
  open,
  canAnswer,
  onOpen,
  onChange,
}: {
  q: Question;
  suggestion?: Proposal;
  /** The board opens one editor at a time, so this is owned there rather than here. */
  open: boolean;
  /**
   * Whether this account may write in the speaker's name. A granted admin moderates the queue
   * and runs the session; the answer itself is the superadmin's. Rendering only — setAnswer
   * refuses them anyway.
   */
  canAnswer: boolean;
  onOpen: (open: boolean) => void;
  onChange: (next: Question) => void;
}) {
  const [draft, setDraft] = useState(q.answer ?? "");
  // Which button is working, so only that one shows a spinner while all of them lock.
  const [busy, setBusy] = useState<"answer" | "moderate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [confirming, setConfirming] = useState<"retract" | "moderate" | null>(null);
  // Only set once the admin accepts a proposal, so an anchor is never written for text they
  // typed themselves.
  const [anchor, setAnchor] = useState<number | undefined>();

  const dirty = draft.trim() !== (q.answer ?? "");
  const offered = suggestion && !dismissed && !q.answer;
  const answered = Boolean(q.answer) && !q.retracted;
  const queued = q.status === "submitted";

  async function save() {
    setBusy("answer");
    setError(null);
    try {
      const res = await setAnswer(q.id, draft, anchor);
      if (!res.ok) throw new Error(res.error);
      onChange(res.data);
      onOpen(false);
    } catch {
      setDraft(q.answer ?? ""); // roll back to what the server still believes
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  async function retract() {
    setBusy("answer");
    setError(null);
    try {
      const res = await setAnswer(q.id, "", undefined);
      if (!res.ok) throw new Error(res.error);
      onChange(res.data);
      setDraft("");
      onOpen(false);
      setConfirming(null);
    } catch {
      setError("Gagal menarik jawaban. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  async function moderate(status: QuestionStatus) {
    setBusy("moderate");
    const res = await setQuestionStatus(q.id, status);
    setBusy(null);
    setConfirming(null);
    if (res.ok) onChange({ ...q, status });
    else setError(res.error);
  }

  return (
    <article
      className={cn(
        "rounded-md border border-border bg-card p-3.5",
        queued && "border-warn-border bg-warn-soft",
        q.status === "hidden" && "border-dashed bg-background"
      )}
    >
      <p className="flex items-center justify-between gap-2.5 text-xs text-faint">
        <Attribution author={q.author} />
        <span className="flex shrink-0 items-center gap-1.5" suppressHydrationWarning>
          <Clock className="size-3.5 stroke-[1.9]" aria-hidden />
          {relativeTime(q.createdAt)}
        </span>
      </p>

      <Clamp className="mt-2 text-lg leading-normal font-semibold tracking-[-0.01em] whitespace-pre-wrap" lines={5}>
        {q.body}
      </Clamp>

      {q.edited && (
        <div className="mt-1.5 text-xs text-faint">
          <RevisionsDialog questionId={q.id} />
        </div>
      )}

      {/* A question awaiting review offers no answer box: approving it is the decision in
          front of the operator, and answering something that may yet be rejected is work
          done twice. */}
      {queued ? (
        <div className="mt-3.5 flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={busy === "moderate"}
            onClick={() => moderate("approved")}
          >
            {busy === "moderate" ? <Spinner /> : <Check aria-hidden />}
            Tayangkan
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => moderate("hidden")}
            disabled={busy === "moderate"}
          >
            <EyeOff aria-hidden />
            Tolak
          </Button>
        </div>
      ) : (
        <>
          {/* The published answer, whether or not the box is open under it: while revising,
              what is currently live is the thing being compared against. */}
          {answered && (
            <div className="mt-3 border-l-[3px] border-primary pl-3.5">
              <Clamp className="text-md leading-relaxed whitespace-pre-wrap text-foreground-soft" lines={4}>
                {q.answer}
              </Clamp>
            </div>
          )}

          {open && canAnswer ? (
            <>
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
              <label
                htmlFor={`a-${q.id}`}
                className="mt-3.5 mb-2 flex items-center gap-1.5 text-sm font-bold text-muted-foreground"
              >
                <CornerDownLeft className="size-3.5 stroke-2" aria-hidden />
                {answered ? "Perbaiki jawaban" : "Tulis jawaban"}
                <span className="sr-only"> untuk: {q.body.slice(0, 60)}</span>
              </label>
              <Textarea
                id={`a-${q.id}`}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ringkas jawaban pemateri…"
                className="min-h-[110px] resize-y"
              />
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" className="flex-1" disabled={!dirty || busy === "answer"} onClick={save}>
                  {busy === "answer" ? <Spinner /> : <Check aria-hidden />}
                  {q.answer ? "Simpan revisi" : "Terbitkan"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onOpen(false);
                    setDraft(q.answer ?? "");
                  }}
                >
                  Batal
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canAnswer && (
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onOpen(true)}>
                  {answered ? (
                    <>
                      <Pencil aria-hidden />
                      Revisi
                    </>
                  ) : offered ? (
                    <>
                      <Sparkles aria-hidden />
                      Ada usulan
                    </>
                  ) : (
                    <>
                      <Plus aria-hidden />
                      Tulis jawaban
                    </>
                  )}
                </Button>
              )}
              {canAnswer && answered && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setConfirming("retract")}
                >
                  <Undo2 aria-hidden />
                  Tarik
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className={cn(!canAnswer && "flex-1")}
                aria-label={q.status === "hidden" ? "Tayangkan lagi" : "Turunkan dari halaman"}
                onClick={() => setConfirming("moderate")}
              >
                {q.status === "hidden" ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
                {q.status === "hidden" && "Tayangkan lagi"}
              </Button>
            </div>
          )}
        </>
      )}

      <div aria-live="polite">
        {error && <p className="mt-2.5 text-sm font-bold text-destructive">{error}</p>}
      </div>

      {/* Both of these change what a jamaah already sees on their own phone, which is the line
          this app draws around a confirmation. */}
      <Confirm
        open={confirming === "retract"}
        onOpenChange={(v) => !v && setConfirming(null)}
        title="Tarik jawaban ini?"
        description="Jawaban ini hilang dari halaman jamaah, dan penanya kembali menunggu. Riwayatnya tersimpan, jadi Anda bisa menuliskannya lagi kapan saja."
        confirmLabel="Tarik jawaban"
        busyLabel="Menarik…"
        busy={busy === "answer"}
        onConfirm={retract}
      />
      <Confirm
        open={confirming === "moderate"}
        onOpenChange={(v) => !v && setConfirming(null)}
        title={q.status === "hidden" ? "Tayangkan pertanyaan ini?" : "Turunkan pertanyaan ini?"}
        description={
          q.status === "hidden"
            ? "Pertanyaan ini kembali tampil di daftar publik majelis, beserta jawabannya bila sudah ada."
            : "Pertanyaan ini hilang dari daftar publik. Penanya masih melihatnya di “Pertanyaan saya”, dan Anda bisa menayangkannya lagi dari bagian Ditolak."
        }
        confirmLabel={q.status === "hidden" ? "Tayangkan" : "Turunkan"}
        busyLabel="Menyimpan…"
        busy={busy === "moderate"}
        onConfirm={() => moderate(q.status === "hidden" ? "approved" : "hidden")}
      />
    </article>
  );
}

export default function AdminBoard({
  eventId,
  youtubeId,
  canAnswer,
}: {
  eventId: string;
  youtubeId?: string;
  /** Superadmin. A granted admin gets the queue and the moderation calls, not the answers. */
  canAnswer: boolean;
}) {
  const [all, setAll] = useState<Question[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Proposals live here and nowhere else: nothing is persisted until an admin saves an answer.
  const [suggestions, setSuggestions] = useState<Record<string, Proposal>>({});
  const [drafting, setDrafting] = useState(false);
  const [draftNote, setDraftNote] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  /**
   * One open answer box on the board, not one per card. Held here because "only one" is a
   * fact about the board; a card cannot know what the others are doing.
   */
  const [openId, setOpenId] = useState<string | null>(null);
  /**
   * Which sections the operator has folded themselves. Sections start from
   * `openByDefault` and only move when they say so — recomputing from the counts would
   * fold a section shut under someone mid-answer, every four seconds, as questions land.
   */
  const [folded, setFolded] = useState<Record<string, boolean>>({});

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

  const grouped = useMemo(
    () => SECTIONS.map((s) => ({ ...s, rows: all.filter(s.match) })),
    [all]
  );

  if (!loaded) return <div className="p-4"><CardSkeleton count={4} /></div>;

  if (all.length === 0) {
    return (
      <Empty className="m-4">
        <EmptyMedia variant="icon">
          <Clock aria-hidden />
        </EmptyMedia>
        <EmptyDescription>Belum ada pertanyaan pada majelis ini.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <>
      {/* Once per session, and outside any section: reading the recording is about the
          majelis, not about one question in it. */}
      {youtubeId && canAnswer && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4">
          <Button size="sm" variant="outline" disabled={drafting} onClick={draft}>
            {drafting ? <Spinner /> : <Sparkles aria-hidden />}
            {drafting ? "Membaca rekaman…" : "Ambil jawaban dari rekaman"}
          </Button>
          {draftNote && (
            <span
              className={cn(
                "text-sm",
                draftNote.tone === "error" ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {draftNote.text}
            </span>
          )}
        </div>
      )}

      {grouped.map(({ key, title, icon: Icon, tone, openByDefault, rows }) => {
        if (rows.length === 0) return null;
        const open = folded[key] ?? openByDefault;
        return (
          <Collapsible
            key={key}
            open={open}
            onOpenChange={(v) => setFolded((prev) => ({ ...prev, [key]: v }))}
          >
            <CollapsibleTrigger>
              <Icon
                className={cn(
                  "size-4.5 stroke-2",
                  tone === "warn" ? "stroke-warn" : tone === "ok" ? "stroke-primary" : "stroke-faint"
                )}
                aria-hidden
              />
              {title}
              <Badge variant={tone === "warn" ? "warning" : "muted"} size="count">
                {rows.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {rows.map((q) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  suggestion={suggestions[q.id]}
                  open={openId === q.id}
                  canAnswer={canAnswer}
                  onOpen={(v) => setOpenId(v ? q.id : null)}
                  onChange={replace}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </>
  );
}
