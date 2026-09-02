"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, X } from "lucide-react";
import Modal from "@/components/admin/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Spinner from "@/components/Spinner";
import { deleteEvent } from "@/lib/actions";
import type { Event } from "@/lib/types";

/**
 * The only destructive control in the app, so it asks for the name to be typed rather than
 * offering a Yes button. What it destroys is stated as a number before anything is typed: the
 * questions go with the event, and so does every answer revision under them.
 */
export default function DeleteEventDialog({
  event,
  questionCount,
}: {
  event: Event;
  questionCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = typed.trim() === event.name.trim();

  function close() {
    if (busy) return; // never leave a delete in flight behind a closed dialog
    setOpen(false);
    setTyped("");
    setError(null);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await deleteEvent(event.id);
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    // Deliberately stays busy: the event is gone, so this component is about to unmount and
    // re-enabling the button would only offer a second delete of nothing.
    router.push("/admin");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[2.75rem] shrink-0 items-center gap-2 rounded-lg border border-destructive-border px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Hapus majelis
      </button>

      <Modal open={open} onClose={close} title="Hapus majelis?">
        <p className="text-[0.9375rem] leading-relaxed">
          {questionCount > 0 ? (
            <>
              Ini menghapus <strong className="font-semibold tabular-nums">{questionCount}</strong>{" "}
              pertanyaan dan seluruh riwayat jawabannya.
            </>
          ) : (
            <>Majelis ini belum punya pertanyaan.</>
          )}{" "}
          Tindakan ini tidak bisa dibatalkan.
        </p>

        <Label htmlFor="confirm-name" className="mt-4">
          Ketik <span className="font-semibold">{event.name}</span> untuk melanjutkan
        </Label>
        <Input
          className="mt-1.5"
          id="confirm-name"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
        />

        {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
            Batal
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={!confirmed || busy}
            className="flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {busy ? <Spinner /> : <Trash2 className="h-4 w-4" aria-hidden />}
            {busy ? "Menghapus…" : "Hapus"}
          </button>
        </div>
      </Modal>
    </>
  );
}
