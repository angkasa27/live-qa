"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import Modal from "@/components/admin/Modal";
import Spinner from "@/components/Spinner";
import { answerHistory } from "@/lib/actions";
import { relativeTime } from "@/lib/relativeTime";
import type { Revision } from "@/lib/types";

/**
 * Every version an answer has had, newest first. Admin only: what a student sees is that the
 * answer was edited, never what it used to say. That asymmetry is the point of ROADMAP.md §3 —
 * a wrong ruling published under a scholar's name gets withdrawn from display, and the record
 * of it survives for the people responsible for it, not for the room.
 *
 * Fetched when the dialog opens rather than with the card: AdminBoard reloads every 4 seconds
 * and history has no business riding along on that.
 */
export default function RevisionsDialog({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Revision[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || rows) return;
    let live = true;
    answerHistory(questionId)
      .then((r) => live && setRows(r))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [open, rows, questionId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[1.75rem] items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <History className="h-3.5 w-3.5" aria-hidden />
        Riwayat
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Riwayat jawaban">
        {error ? (
          <p className="text-sm text-destructive">Gagal memuat riwayat.</p>
        ) : !rows ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Memuat…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
        ) : (
          <ol className="space-y-3">
            {rows.map((r, i) => (
              <li key={r.createdAt + i} className="rounded-lg border border-border p-3">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {/* The newest row is what is published now; the rest are what it replaced. */}
                  <span className="font-medium text-foreground">
                    {i === 0 ? "Versi sekarang" : `Versi ${rows.length - i}`}
                  </span>
                  <span aria-hidden>·</span>
                  <time dateTime={r.createdAt} suppressHydrationWarning>
                    {relativeTime(r.createdAt)}
                  </time>
                  {r.editedBy && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{r.editedBy}</span>
                    </>
                  )}
                </p>
                {/* A retraction is an event in its own right, not an empty row. */}
                {r.retracted || r.answer === null ? (
                  <p className="mt-1.5 text-sm italic text-muted-foreground">Jawaban ditarik.</p>
                ) : (
                  <p className="mt-1.5 whitespace-pre-wrap text-[0.9375rem]">
                    {r.answer}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </>
  );
}
