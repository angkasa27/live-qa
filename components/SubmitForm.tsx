"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, ListChecks, Send, VenetianMask } from "lucide-react";
import Spinner from "@/components/Spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addQuestion } from "@/lib/actions";
import { MAX_BODY } from "@/lib/types";

export default function SubmitForm({
  eventId,
  moderated = false,
}: {
  eventId: string;
  /** Manual moderation: say so up front rather than letting the question seem to vanish. */
  moderated?: boolean;
}) {
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(true);
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
    } catch {
      setError("Koneksi terputus. Pertanyaan Anda masih tersimpan di halaman ini — tekan kirim lagi.");
    } finally {
      setBusy(false);
    }
  }

  const counterTone =
    body.length > MAX_BODY ? "text-destructive" : body.length > MAX_BODY - 50 ? "text-warn" : "text-faint";

  // Sending is the end of this screen, not a line of feedback on it: the question is gone, and
  // the two things left to do are check on it or go back. Design P3.
  if (sent && !error) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center gap-3.5 px-2 py-7 text-center">
          <span
            className="flex h-13 w-13 items-center justify-center rounded-full border border-accent-border bg-accent text-primary"
            aria-hidden
          >
            <Check className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <h2 className="font-serif text-[1.4375rem] leading-snug font-medium">
            {moderated ? "Pertanyaan Anda terkirim" : "Sudah masuk antrean"}
          </h2>
          <p className="text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty">
            {moderated
              ? "Majelis ini memakai review admin, jadi pertanyaan Anda menunggu disetujui sebelum tampil. Tidak perlu mengirim ulang."
              : "Pertanyaan Anda langsung tampil dan sudah terbaca oleh admin majelis. Urutannya sesuai waktu bertanya."}
          </p>
          {moderated && (
            <Alert variant="warn" className="text-[0.8125rem]">
              <AlertDescription>
                Anda tetap bisa melihat pertanyaan ini di daftar — ditandai{" "}
                <strong className="font-bold">menunggu review</strong> dan hanya terlihat oleh Anda.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <div className="-mx-4 mt-6 flex flex-col gap-2.5 border-t border-border-soft px-4 pt-3 sm:-mx-6 sm:px-6 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
          <Link
            href="/pertanyaan-saya"
            className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-[14px] bg-primary font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ListChecks className="h-[18px] w-[18px]" aria-hidden />
            Lihat pertanyaan saya
          </Link>
          <Link
            href={`/events/${eventId}`}
            className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-border bg-card text-[0.9375rem] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Kembali ke majelis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <div className="flex-1 space-y-5">
        <div>
          <label htmlFor="body" className="block text-sm font-semibold">
            Pertanyaan Anda
          </label>
          <Textarea
            id="body"
            autoFocus
            rows={6}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (sent) setSent(false);
            }}
            placeholder="Apa yang ingin Anda tanyakan?"
            className="mt-2 resize-none rounded-xl bg-card p-3 font-serif text-[1.0625rem] placeholder:font-sans"
          />
          <p className="mt-[7px] flex items-center justify-between text-xs text-faint">
            <span>Maksimal {MAX_BODY} karakter</span>
            <span className={`tabular-nums ${counterTone}`}>
              {body.length} / {MAX_BODY}
            </span>
          </p>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-3.5">
            <span>
              <span className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                <VenetianMask className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
                Tanya secara anonim
              </span>
              <span className="mt-0.5 block text-xs text-faint">Nama tidak ditampilkan</span>
            </span>
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-primary"
            />
          </label>
          {!anonymous && (
            <div className="border-t border-border-soft px-3.5 py-3">
              <label htmlFor="author" className="block text-sm font-semibold">
                Nama Anda
              </label>
              <Input
                id="author"
                value={author}
                autoComplete="name"
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="mis. Rani"
                className="mt-2 min-h-12 rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Manual review is the difference between "sent" and "published", and it is cheaper to
            say so before the send than to explain a question that seems to have vanished. */}
        {moderated && (
          <Alert variant="warn" className="rounded-xl text-[0.8125rem]">
            <AlertDescription>
              Majelis ini memakai review admin. Pertanyaan Anda tampil setelah disetujui.
            </AlertDescription>
          </Alert>
        )}

        <div aria-live="polite" className="min-h-6">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertTitle className="font-bold">Gagal mengirim.</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border-soft bg-background/90 px-4 pt-3 backdrop-blur sm:-mx-6 sm:px-6 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
        <button
          type="submit"
          disabled={!canSend}
          className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-[14px] bg-primary font-bold text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {busy ? <Spinner /> : <Send className="h-[18px] w-[18px]" aria-hidden />}
          {busy ? "Mengirim…" : error ? "Coba kirim lagi" : "Kirim pertanyaan"}
        </button>
      </div>
    </form>
  );
}
