"use client";

import Link from "next/link";
import { useState } from "react";
import Spinner from "@/components/Spinner";
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
      setError("Gagal mengirim. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const counterTone =
    body.length > MAX_BODY ? "text-red-500" : body.length > MAX_BODY - 50 ? "text-amber-500" : "text-muted";

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <div className="flex-1 space-y-5">
        <div>
          <label htmlFor="body" className="block text-sm font-medium">
            Pertanyaan Anda
          </label>
          <textarea
            id="body"
            autoFocus
            rows={6}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (sent) setSent(false);
            }}
            placeholder="Apa yang ingin Anda tanyakan?"
            className="mt-2 w-full resize-none rounded-xl border border-border bg-surface p-3.5 leading-relaxed outline-none transition-colors placeholder:text-muted focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
          />
          <p className={`mt-1.5 text-right text-xs tabular-nums ${counterTone}`}>
            {body.length} / {MAX_BODY}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface">
          <label className="flex min-h-[3.25rem] cursor-pointer items-center justify-between gap-3 px-4">
            <span className="text-[0.9375rem] font-medium">Tanya secara anonim</span>
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-accent"
            />
          </label>
          {!anonymous && (
            <div className="border-t border-border px-4 py-3">
              <label htmlFor="author" className="block text-sm font-medium">
                Nama Anda
              </label>
              <input
                id="author"
                value={author}
                autoComplete="name"
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="mis. Rani"
                className="mt-2 min-h-[2.75rem] w-full rounded-lg border border-border bg-background px-3 outline-none transition-colors placeholder:text-muted focus:border-accent"
              />
            </div>
          )}
        </div>

        <div aria-live="polite" className="min-h-[1.5rem]">
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          {sent && !error && (
            <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-accent">
              {moderated ? "Terkirim, menunggu review admin." : "Terkirim ke pemateri."}
              <Link href="/pertanyaan-saya" className="underline underline-offset-4">
                Pertanyaan saya →
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-background/85 px-4 pt-3 backdrop-blur sm:-mx-6 sm:px-6 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="submit"
          disabled={!canSend}
          className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-fg transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {busy && <Spinner />}
          {busy ? "Mengirim…" : "Kirim pertanyaan"}
        </button>
      </div>
    </form>
  );
}
