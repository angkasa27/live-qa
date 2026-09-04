"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardSkeleton } from "@/components/Skeleton";
import RevisionsDialog from "@/components/RevisionsDialog";
import Spinner from "@/components/Spinner";
import {
  Check,
  Clock,
  CornerDownRight,
  Eye,
  EyeOff,
  Inbox,
  Pencil,
  Plus,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import Clamp from "@/components/admin/Clamp";
import Confirm from "@/components/admin/Confirm";
import { Attribution } from "@/components/QuestionCard";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Textarea } from "@/components/ui/textarea";
import { adminList, draftAnswers, setAnswer, setQuestionStatus } from "@/lib/actions";
import { relativeTime } from "@/lib/relativeTime";
import { timecode, type Proposal, type Question, type QuestionStatus } from "@/lib/types";

/**
 * Short on purpose. These are chips on a 390px phone: at "Menunggu review" and "Sudah
 * dijawab" only two fit before the row runs off the screen, and a filter you cannot see
 * is a filter you do not use.
 */
const FILTERS = [
  "Review",
  "Belum dijawab",
  "Terjawab",
  "Semua",
  // Last: hiding is the reject, and it is reversible, but it is also the rarest thing an
  // operator comes here to look at. Without the chip a hidden question could only be found
  // by scanning "Semua", which is the whole session.
  "Disembunyikan",
] as const;
type Filter = (typeof FILTERS)[number];

function match(q: Question, filter: Filter) {
  switch (filter) {
    case "Review":
      return q.status === "submitted";
    case "Belum dijawab":
      return !q.answer && q.status !== "hidden";
    case "Terjawab":
      return !!q.answer;
    case "Disembunyikan":
      return q.status === "hidden";
    default:
      return true;
  }
}

/** The admin board's own labels. Thin over Badge so the tones stay the documented ones. */
function Pill({ tone, children }: { tone: "warn" | "primary" | "plain"; children: React.ReactNode }) {
  const variant = { warn: "warn", primary: "accent", plain: "outline" } as const;
  return (
    <Badge variant={variant[tone]} className="font-medium normal-case tracking-normal">
      {children}
    </Badge>
  );
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
        partly ? "border-warn-border bg-warn-soft" : "border-primary/40 bg-accent/40"
      }`}
    >
      <p className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Usulan dari rekaman
        </span>
        {partly && <Pill tone="warn">dijawab sebagian</Pill>}
        <span className="tabular-nums">{timecode(proposal.videoStart)}</span>
      </p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{proposal.draft}</p>
      <p className="mt-2 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
        “{proposal.quote}”
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onUse}
          className="flex min-h-[2.25rem] items-center gap-1.5 rounded-lg border border-primary px-3 text-sm font-medium text-primary"
        >
          <Check className="h-4 w-4" aria-hidden />
          Gunakan
        </button>
        <button
          onClick={onDismiss}
          className="flex min-h-[2.25rem] items-center gap-1.5 px-2 text-sm font-medium text-muted-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
          Abaikan
        </button>
      </div>
    </div>
  );
}

/**
 * Where this question stands, in one badge. Moderation and answeredness are two axes
 * (REQUIREMENTS.md § Orthogonal pairs) and this reads them out in that order rather than
 * collapsing them into a single status — a question can be approved and unanswered, or
 * answered and hidden.
 */
function StateBadge({ q }: { q: Question }) {
  if (q.status === "submitted") {
    return (
      <Badge variant="warn" className="text-[0.625rem]">
        <Clock className="h-3 w-3" aria-hidden />
        Butuh review
      </Badge>
    );
  }
  const moderation = q.status === "hidden" ? "Disembunyikan" : "Disetujui";
  const answer = q.retracted ? "ditarik" : q.answer ? (q.edited ? "direvisi" : "terjawab") : "belum dijawab";
  return (
    <Badge
      variant={q.answer && !q.retracted ? "accent" : "outline"}
      className="text-[0.625rem]"
    >
      {q.status === "hidden" && <EyeOff className="h-3 w-3" aria-hidden />}
      {moderation} · {answer}
    </Badge>
  );
}

/**
 * One button in a card's action row. Four tones, ranked by how much room the act deserves:
 * `primary` is the publish, `outline` the act a card is offering, and `quiet` /
 * `destructive` are the ones that used to be boxed alongside them — three bordered buttons
 * per card read as three equal choices and cost a card's whole width. Quiet keeps the touch
 * target and drops the border. Destructive is quiet too: retracting an answer is reversible
 * and the history survives it, so it does not get a box either.
 *
 * `grow` is the only thing that stretches a button; a tone no longer decides its width.
 */
function Action({
  onClick,
  busy,
  disabled,
  tone = "quiet",
  grow,
  children,
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "primary" | "outline" | "quiet" | "destructive";
  grow?: boolean;
  children: React.ReactNode;
}) {
  const style = {
    primary: "rounded-xl bg-primary px-3 text-primary-foreground hover:opacity-90",
    outline: "rounded-xl border border-border bg-card px-3 text-primary hover:border-primary",
    quiet: "rounded-lg px-2 text-muted-foreground hover:bg-muted hover:text-foreground",
    destructive: "rounded-lg px-2 text-destructive hover:bg-destructive-soft",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      /* nowrap: "Terbitkan jawaban" wrapped to two lines inside an equal-width pair, which
         made the row taller than the textarea above it. Narrower padding buys the space. */
      className={`flex min-h-11 items-center justify-center gap-1.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${style} ${grow ? "flex-1" : ""}`}
    >
      {busy ? <Spinner /> : children}
    </button>
  );
}

function Row({
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
   * and runs the session; the answer itself is the superadmin's, so for them the card ends at
   * Setujui / Sembunyikan and the published answer stays readable but untouchable.
   *
   * Rendering only — setAnswer refuses them anyway.
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
  /**
   * Which confirmation is up, if any. One at a time by construction: a card offers retract and
   * hide side by side and both are behind the same modal.
   */
  const [confirming, setConfirming] = useState<"retract" | "moderate" | null>(null);
  // Only set once the admin accepts a proposal, so an anchor is never written for text they
  // typed themselves.
  const [anchor, setAnchor] = useState<number | undefined>();

  const dirty = draft.trim() !== (q.answer ?? "");
  const offered = suggestion && !dismissed && !q.answer;
  const answered = Boolean(q.answer) && !q.retracted;

  /**
   * Opening the box is what asks for the keyboard, so it also takes the caret — and puts it
   * after the existing text, because the other way in here is "Revisi", where an operator is
   * continuing a sentence rather than starting one.
   *
   * Closing never clears `draft`: the row stays mounted, so a half-typed answer set aside to
   * approve something else is still there when the card is reopened.
   */
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = open ? box.current : null;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [open]);

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
    <li
      className={`overflow-hidden rounded-xl border ${
        q.status === "submitted" ? "border-warn-border bg-warn-soft" : "border-border bg-card"
      }`}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <StateBadge q={q} />
          <span className="shrink-0 text-xs text-faint" suppressHydrationWarning>
            {relativeTime(q.createdAt)}
          </span>
        </div>
        <Clamp className="mt-2.5 whitespace-pre-wrap text-[1.0625rem] leading-relaxed" lines={5}>
          {q.body}
        </Clamp>
        {/* A div, not a p: RevisionsDialog carries a <dialog>, which a <p> would not hold. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-faint">
          <Attribution author={q.author} />
          {q.edited && <RevisionsDialog questionId={q.id} />}
        </div>

        {/* What the card offers depends on where the question stands. A question awaiting
            review offers no answer box: approving it is the decision in front of the
            operator, and answering something that may yet be hidden is work done twice. */}
        {q.status === "submitted" ? (
          <div className="mt-3.5 flex gap-2.5">
            <Action onClick={() => moderate("approved")} busy={busy === "moderate"} tone="primary" grow>
              <Check className="h-4 w-4" aria-hidden />
              Setujui
            </Action>
            <Action onClick={() => moderate("hidden")} busy={busy === "moderate"} tone="outline" grow>
              <EyeOff className="h-4 w-4" aria-hidden />
              Sembunyikan
            </Action>
          </div>
        ) : (
          <div className="mt-3.5">
            {/* The published answer, whether or not the box is open under it: while revising,
                what is currently live is the thing being compared against. */}
            {answered && (
              <div className="rounded-r-[10px] border-l-[3px] border-primary bg-accent px-3 py-2.5">
                <Clamp className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap" lines={4}>
                  {q.answer}
                </Clamp>
              </div>
            )}

            {open && canAnswer ? (
              <div className={answered ? "mt-3" : undefined}>
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
                  className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground"
                >
                  <CornerDownRight className="h-4 w-4" aria-hidden />
                  {answered ? "Perbaiki jawaban" : "Tulis jawaban"}
                  <span className="sr-only"> untuk: {q.body.slice(0, 60)}</span>
                </label>
                <Textarea
                  ref={box}
                  id={`a-${q.id}`}
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ringkas jawaban pemateri…"
                  className="resize-y bg-card"
                />
                {/* Only the two moves that belong to an open box. Hiding and retracting are
                    still one tap away with it closed, and offering them mid-sentence was
                    most of what made this row unreadable. */}
                <div className="mt-2.5 flex gap-2.5">
                  <Action onClick={save} busy={busy === "answer"} tone="primary" disabled={!dirty} grow>
                    <Check className="h-4 w-4" aria-hidden />
                    {q.answer ? "Simpan revisi" : "Terbitkan jawaban"}
                  </Action>
                  <Action onClick={() => { onOpen(false); setDraft(q.answer ?? ""); }}>
                    <X className="h-4 w-4" aria-hidden />
                    Batal
                  </Action>
                </div>
              </div>
            ) : (
              /* Closed: the act this card is for, boxed, and everything else as text beside
                 it. A4 still holds — revising is one tap, exactly like answering. */
              <div className={`flex flex-wrap items-center gap-1.5 ${answered ? "mt-2.5" : ""}`}>
                {canAnswer && (
                <Action onClick={() => onOpen(true)} tone="outline" grow>
                  {answered ? (
                    <>
                      <Pencil className="h-4 w-4" aria-hidden />
                      Revisi jawaban
                    </>
                  ) : offered ? (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden />
                      Ada usulan dari rekaman
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" aria-hidden />
                      Masukkan jawaban
                    </>
                  )}
                </Action>
                )}
                {canAnswer && answered && (
                  <Action onClick={() => setConfirming("retract")} tone="destructive">
                    <Undo2 className="h-4 w-4" aria-hidden />
                    Tarik
                  </Action>
                )}
                <Action onClick={() => setConfirming("moderate")} grow={!canAnswer}>
                  {q.status === "hidden" ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                  {q.status === "hidden" ? "Tampilkan" : "Sembunyikan"}
                </Action>
              </div>
            )}
          </div>
        )}

        <div aria-live="polite">
          {error && <p className="mt-2.5 text-sm font-medium text-destructive">{error}</p>}
        </div>
      </div>

      {/* Both of these change what a jamaah already sees on their own phone, which is the line
          this app draws around a confirmation — an answer people have read disappearing, or a
          question appearing in or vanishing from the public list. */}
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
        title={q.status === "hidden" ? "Tampilkan pertanyaan ini?" : "Sembunyikan pertanyaan ini?"}
        description={
          q.status === "hidden"
            ? "Pertanyaan ini kembali tampil di daftar publik majelis, beserta jawabannya bila sudah ada."
            : "Pertanyaan ini hilang dari daftar publik. Penanya masih melihatnya di “Pertanyaan saya”, dan Anda bisa menampilkannya lagi lewat filter Disembunyikan."
        }
        confirmLabel={q.status === "hidden" ? "Tampilkan" : "Sembunyikan"}
        busyLabel="Menyimpan…"
        busy={busy === "moderate"}
        onConfirm={() => moderate(q.status === "hidden" ? "approved" : "hidden")}
      />
    </li>
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
  // Null until the first load says what is actually here; see `filter` below.
  const [picked, setPicked] = useState<Filter | null>(null);
  // Proposals live here and nowhere else: nothing is persisted until an admin saves an answer.
  const [suggestions, setSuggestions] = useState<Record<string, Proposal>>({});
  const [drafting, setDrafting] = useState(false);
  /**
   * One open answer box on the board, not one per card. Every card used to render its
   * textarea and both its buttons whether or not anyone was writing in it, which made a
   * queue of twenty questions a page of twenty forms. Held here because "only one" is a
   * fact about the board; a card cannot know what the others are doing.
   */
  const [openId, setOpenId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    adminList(eventId).then((qs) => {
      setAll(qs);
      setLoaded(true);
    });
  }, [eventId]);

  /**
   * A3 says default to the work rather than the full archive — but "the work" is not always
   * the same chip, and a fixed default lands an archived session on an empty board with its
   * questions apparently gone. So: whatever needs doing, else everything.
   *
   * Only until the operator picks for themselves. Recomputing after that would move the
   * board under someone mid-answer, every four seconds, as the counts change.
   */
  const filter: Filter =
    picked ??
    (all.some((q) => q.status === "submitted")
      ? "Review"
      : all.some((q) => !q.answer && q.status !== "hidden")
        ? "Belum dijawab"
        : "Semua");

  useEffect(() => {
    load();
    // Same 4s poll as the speaker deck, and for the same reason: this is an operator screen
    // during a live session, not one of the 5000 phones.
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  // The default filter depends on content, so the selected chip can start anywhere in the
  // row. Bring it into view once the first load has decided, or the strip looks unselected.
  const activeChip = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (loaded) activeChip.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [loaded]);

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
            ref={f === filter ? activeChip : undefined}
            onClick={() => setPicked(f)}
            aria-pressed={filter === f}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
              filter === f
                ? "border-primary bg-primary font-semibold text-primary-foreground"
                : f === "Review" && counts[f] > 0
                  ? "border-warn-border bg-warn-soft font-semibold text-warn"
                  : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            {f}
            {loaded && counts[f] > 0 && (
              <span className="tabular-nums opacity-80">{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Outside the sticky strip on purpose: this is a once-per-session action, and it would
          scroll out of reach inside a horizontally scrolling row of chips. */}
      {youtubeId && canAnswer && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            onClick={draft}
            disabled={drafting}
            className="flex min-h-[2.5rem] items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors disabled:opacity-40 hover:border-primary hover:text-foreground"
          >
            {drafting ? <Spinner /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {drafting ? "Membaca rekaman…" : "Ambil jawaban dari rekaman"}
          </button>
          {draftNote && (
            <span className={`text-sm ${draftNote.tone === "error" ? "text-destructive" : "text-muted-foreground"}`}>
              {draftNote.text}
            </span>
          )}
        </div>
      )}

      {!loaded ? (
        <CardSkeleton count={4} />
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <Inbox aria-hidden />
          </EmptyMedia>
          <EmptyDescription>Tidak ada apa-apa di sini.</EmptyDescription>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((q) => (
            <Row
              key={q.id}
              q={q}
              suggestion={suggestions[q.id]}
              open={openId === q.id}
              canAnswer={canAnswer}
              onOpen={(v) => setOpenId(v ? q.id : null)}
              onChange={replace}
            />
          ))}
        </ul>
      )}
    </>
  );
}
