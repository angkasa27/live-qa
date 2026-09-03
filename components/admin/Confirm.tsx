"use client";

import Spinner from "@/components/Spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * The one shape every confirmation in this app takes: what is about to happen, in a sentence,
 * over Batal and the act itself named again in full.
 *
 * The act is named, never "OK" — an operator halfway through a live session reads the button,
 * not the paragraph, and "Tarik jawaban" and "Hapus sesi" are different enough to be worth the
 * two extra words. `AlertDialogAction` is a plain button rather than a Close, so the dialog
 * stays open with its spinner running until the server answers and the caller closes it; a
 * failed retract that had already dismissed itself would look like it worked.
 *
 * What this deliberately does NOT guard: routine moderation. Approving or rejecting a question
 * that is still in the review queue is the operator's ordinary work, dozens of times an hour,
 * and nobody outside the room has seen it yet. Confirming those is how people learn to dismiss
 * confirmations without reading them. See docs/DESIGN.md.
 */
export default function Confirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busyLabel,
  busy,
  disabled,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  /** Names the act, in the imperative. Never "Ya" or "OK". */
  confirmLabel: string;
  busyLabel: string;
  busy?: boolean;
  /** A gate the body imposes, e.g. the session's name typed out before a delete. */
  disabled?: boolean;
  onConfirm: () => void;
  /** Extra body between the description and the buttons. Most confirmations need none. */
  children?: React.ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy || disabled}
            onClick={onConfirm}
          >
            {busy && <Spinner />}
            {busy ? busyLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
