"use client";

import { useEffect, useRef } from "react";

/**
 * A modal built on the native `<dialog>`. It is the whole reason there is no dialog library
 * here: `showModal()` already gives inertness behind the modal, focus containment, Escape to
 * close and focus returning to whatever opened it.
 *
 * Two things the platform does not give and this adds: closing on a backdrop click (the click
 * lands on the dialog element itself, never on the inner box), and keeping `open` as the single
 * source of truth so React state and the DOM's own `.open` can't drift apart.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Fires for Escape and the close button alike, so onClose is told exactly once either way.
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-lg rounded-xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h2 className="min-w-0 flex-1 text-base font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
    </dialog>
  );
}
