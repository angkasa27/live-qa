"use client";

import { ArrowLeft, Check, ListChecks, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import PageShell from "@/components/PageShell";
import Spinner from "@/components/Spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addQuestion } from "@/lib/actions";
import { MAX_BODY } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AskForm({
  eventId,
  eventName,
  moderated,
}: {
  eventId: string;
  eventName: string;
  /** Manual moderation: say so before the send, not after the question seems to vanish. */
  moderated: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  // Named by default: the box is unticked, and going without a name is the deliberate act.
  const [anonymous, setAnonymous] = useState(false);
  const [author, setAuthor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const trimmed = body.trim();
  const over = body.length > MAX_BODY;
  const canSend = trimmed.length > 0 && !over && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) return setError("Tulis pertanyaan Anda dulu.");
    if (over) return setError(`Maksimal ${MAX_BODY} karakter.`);

    setError(null);
    setBusy(true);
    try {
      // The server re-checks all of this. What's above is only there to save a round trip.
      const res = await addQuestion({
        eventId,
        body: trimmed,
        author: anonymous ? null : author.trim() || null,
      });
      if (!res.ok) return setError(res.error);
      setBody("");
      setSent(true);
      // The majelis is what we go back to, and it has to show the new question.
      router.refresh();
    } catch {
      setError("Koneksi terputus. Pertanyaan Anda masih tersimpan di sini — tekan kirim lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <Confirmation eventId={eventId} moderated={moderated} />;

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <PageShell
        action={
          <Button type="submit" size="lg" disabled={!canSend}>
            {busy ? <Spinner /> : <Send aria-hidden />}
            {busy ? "Mengirim…" : error ? "Coba kirim lagi" : "Kirim pertanyaan"}
          </Button>
        }
      >
        <h1 className="text-2xl font-bold tracking-[-0.025em]">Kirim pertanyaan</h1>
        <p className="text-base text-muted-foreground">
          Untuk <strong className="font-semibold text-foreground">{eventName}</strong>
        </p>

        <Field className="mt-4.5 gap-2">
          <FieldLabel htmlFor="body">Pertanyaan</FieldLabel>
          <Textarea
            id="body"
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tulis pertanyaan Anda…"
            aria-invalid={over}
            className="min-h-[150px] resize-none"
          />
          <p
            className={cn(
              "text-right text-xs tabular-nums",
              over ? "text-destructive" : body.length > MAX_BODY - 50 ? "text-warn" : "text-faint"
            )}
          >
            {body.length} / {MAX_BODY}
          </p>
        </Field>

        <Field className="mt-4 gap-2">
          <FieldLabel htmlFor="author">Nama</FieldLabel>
          <Input
            id="author"
            value={author}
            autoComplete="name"
            disabled={anonymous}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Nama Anda"
          />
        </Field>

        {/* Ticking this empties the name and locks it, so the two can never disagree.
            Anonymity is display only — it hides the name from the page, and says nothing
            about who actually submitted. See REQUIREMENTS.md § Invariants. */}
        <label className="mt-1.5 flex min-h-12 cursor-pointer items-center gap-3 text-md">
          <Checkbox
            checked={anonymous}
            onCheckedChange={(v) => {
              setAnonymous(v);
              if (v) setAuthor("");
            }}
          />
          Kirim tanpa nama
        </label>

        {moderated && (
          <Alert variant="warning" className="mt-4">
            <AlertDescription>
              Majelis ini memakai review admin. Pertanyaan Anda tampil setelah disetujui.
            </AlertDescription>
          </Alert>
        )}

        <div aria-live="polite">
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </PageShell>
    </form>
  );
}

/**
 * The confirmation states what happens next, and that differs by review mode. Two texts, not
 * one hedged text covering both — "menunggu disetujui" and "langsung tampil" are different
 * promises, and saying the wrong one is what makes people submit twice.
 */
function Confirmation({ eventId, moderated }: { eventId: string; moderated: boolean }) {
  return (
    <PageShell
      action={
        <div className="space-y-2.5">
          <Button size="lg" render={<Link href="/my-questions" />}>
            <ListChecks aria-hidden />
            Lihat pertanyaan saya
          </Button>
          <Button variant="outline" size="lg" render={<Link href={`/events/${eventId}`} />}>
            <ArrowLeft aria-hidden />
            Kembali ke majelis
          </Button>
        </div>
      }
    >
      <div className="py-7 text-center">
        <span
          className="mx-auto flex size-14 items-center justify-center rounded-full border border-accent-border bg-accent text-primary"
          aria-hidden
        >
          <Check className="size-6" strokeWidth={2.5} />
        </span>
        <h1 className="mt-3.5 text-2xl font-bold tracking-[-0.025em]">
          {moderated ? "Pertanyaan Anda terkirim" : "Sudah masuk antrean"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-base text-muted-foreground text-pretty">
          {moderated
            ? "Majelis ini memakai review admin, jadi pertanyaan Anda menunggu disetujui sebelum tampil. Tidak perlu mengirim ulang."
            : "Pertanyaan Anda langsung tampil dan sudah terbaca oleh admin majelis. Urutannya sesuai waktu bertanya."}
        </p>
      </div>

      {/* The pending question is visible to its asker and to nobody else. Saying so is what
          stops a second submission and the admin moderating one question twice. */}
      {moderated && (
        <Alert variant="warning" className="text-left">
          <AlertDescription>
            Anda tetap bisa melihat pertanyaan ini di daftar — ditandai{" "}
            <strong className="font-bold">menunggu review</strong> dan hanya terlihat oleh Anda.
          </AlertDescription>
        </Alert>
      )}
    </PageShell>
  );
}
