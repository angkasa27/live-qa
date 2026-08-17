"use client";

import Link from "next/link";
import { useState } from "react";
import { MAX_BODY, useQa } from "@/lib/store";

export default function SubmitForm({ eventId }: { eventId: string }) {
  const { addQuestion } = useQa();
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
    if (!trimmed) return setError("Write your question first.");
    if (over) return setError(`Keep it under ${MAX_BODY} characters.`);

    setError(null);
    setBusy(true);
    try {
      await addQuestion({
        eventId,
        body: trimmed,
        author: anonymous ? null : author.trim() || null,
      });
      setBody("");
      setSent(true);
    } catch {
      setError("Couldn't send that. Try again.");
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
            Your question
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
            placeholder="What would you like to ask?"
            className="mt-2 w-full resize-none rounded-xl border border-border bg-surface p-3.5 leading-relaxed outline-none transition-colors placeholder:text-muted focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
          />
          <p className={`mt-1.5 text-right text-xs tabular-nums ${counterTone}`}>
            {body.length} / {MAX_BODY}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface">
          <label className="flex min-h-[3.25rem] cursor-pointer items-center justify-between gap-3 px-4">
            <span className="text-[0.9375rem] font-medium">Ask anonymously</span>
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
                Your name
              </label>
              <input
                id="author"
                value={author}
                autoComplete="name"
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Rani"
                className="mt-2 min-h-[2.75rem] w-full rounded-lg border border-border bg-background px-3 outline-none transition-colors placeholder:text-muted focus:border-accent"
              />
            </div>
          )}
        </div>

        <div aria-live="polite" className="min-h-[1.5rem]">
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          {sent && !error && (
            <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-accent">
              Sent to the speaker.
              <Link href={`/events/${eventId}/questions`} className="underline underline-offset-4">
                See all questions →
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-background/85 px-4 pt-3 backdrop-blur sm:-mx-6 sm:px-6 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="submit"
          disabled={!canSend}
          className="min-h-[3rem] w-full rounded-xl bg-accent font-semibold text-accent-fg transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {busy ? "Sending…" : "Send question"}
        </button>
      </div>
    </form>
  );
}
