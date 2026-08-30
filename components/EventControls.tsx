"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Segmented from "@/components/admin/Segmented";
import Spinner from "@/components/Spinner";
import { updateEvent } from "@/lib/actions";
import type { Event, EventStatus } from "@/lib/types";

const STATUS = [
  ["scheduled", "Akan datang"],
  ["live", "Berlangsung"],
  ["archived", "Arsip"],
] as const satisfies readonly (readonly [EventStatus, string])[];

/** Just the settings this panel owns. `accepting` is the raw column: null = follow the status. */
type Draft = {
  status: EventStatus;
  accepting: boolean | null;
  moderation: "auto" | "manual";
};

const draftOf = (e: Event): Draft => ({
  status: e.status,
  // getEvent resolves accepting_questions through coalesce, so the raw null is not on the wire.
  // It is recoverable: an event whose resolved value already matches its status is following it.
  accepting: e.acceptingQuestions === (e.status === "live") ? null : e.acceptingQuestions,
  moderation: e.moderation,
});

/** Whether questions are open, given a draft. One expression, mirroring accepting_questions(). */
const isOpen = (d: Draft) => d.accepting ?? d.status === "live";

function Setting({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.9375rem] font-medium">{label}</p>
      <p className="mb-2 mt-0.5 text-xs text-muted">{hint}</p>
      {children}
    </div>
  );
}

/**
 * Settings live behind a summary line rather than above the questions: during a session the
 * operator is reading questions, not flipping switches.
 *
 * Nothing here writes until Simpan. An earlier version saved on every tap, which meant one
 * mis-aimed thumb could archive a running majelis with no undo. The summary previews the draft
 * so a collapsed panel still shows what is pending, and says so when it is unsaved.
 */
export default function EventControls({ event }: { event: Event }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => draftOf(event));

  const saved = draftOf(event);
  const dirty =
    draft.status !== saved.status ||
    draft.accepting !== saved.accepting ||
    draft.moderation !== saved.moderation;

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  };

  function save() {
    setError(null);
    start(async () => {
      const res = await updateEvent(event.id, {
        status: draft.status,
        acceptingQuestions: draft.accepting,
        moderation: draft.moderation,
      });
      if (!res.ok) return setError(res.error);
      router.refresh(); // the server is the truth; `saved` re-derives from the fresh event
    });
  }

  // Questions normally follow the status; an explicit override is what keeps a finished session
  // taking them. Showing the resolved value rather than the raw column avoids a control that
  // reads "off" while the event is in fact open.
  const open = isOpen(draft);
  const openByStatus = draft.status === "live";
  const overridden = draft.accepting !== null;

  const summary = [
    STATUS.find(([s]) => s === draft.status)![1],
    open ? "terbuka" : "tertutup",
    draft.moderation === "manual" ? "review manual" : "review otomatis",
  ].join(" · ");

  return (
    <details className="group rounded-xl border border-border bg-surface" aria-busy={pending}>
      <summary className="flex min-h-[3.25rem] cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-medium">Pengaturan</span>
          <span className="block truncate text-xs text-muted">{summary}</span>
        </span>
        {/* A collapsed panel must never hide an unsaved change. */}
        {dirty && !pending && (
          <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
            belum disimpan
          </span>
        )}
        {pending && <Spinner className="h-4 w-4 shrink-0 text-muted" />}
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="space-y-5 border-t border-border p-4">
        <Setting label="Status" hint="Menentukan bagaimana majelis tampil untuk jamaah.">
          <Segmented
            label="Status majelis"
            value={draft.status}
            options={STATUS}
            onChange={(status) => set({ status })}
          />
        </Setting>

        <Setting
          label="Menerima pertanyaan"
          hint={
            overridden
              ? "Diatur manual, tidak mengikuti status."
              : `Mengikuti status: ${openByStatus ? "terbuka selama berlangsung" : "tertutup"}.`
          }
        >
          <Segmented
            label="Menerima pertanyaan"
            value={open ? "open" : "closed"}
            options={[
              ["open", "Buka"],
              ["closed", "Tutup"],
            ]}
            onChange={(v) => set({ accepting: v === "open" })}
          />
          {overridden && (
            <button
              type="button"
              onClick={() => set({ accepting: null })}
              className="mt-2 min-h-[2.25rem] text-sm font-medium text-accent underline underline-offset-4"
            >
              Ikuti status lagi
            </button>
          )}
        </Setting>

        <Setting
          label="Review pertanyaan"
          hint={
            draft.moderation === "manual"
              ? "Pertanyaan baru menunggu persetujuan sebelum tampil."
              : "Pertanyaan baru langsung tampil."
          }
        >
          <Segmented
            label="Review pertanyaan"
            value={draft.moderation}
            options={[
              ["auto", "Otomatis"],
              ["manual", "Manual"],
            ]}
            onChange={(moderation) => set({ moderation })}
          />
        </Setting>

        {error && <p className="text-sm font-medium text-red-500">{error}</p>}

        {dirty && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft(saved)}
              disabled={pending}
              className="min-h-[2.75rem] rounded-lg border border-border px-4 text-sm font-medium text-muted disabled:opacity-40"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="ml-auto flex min-h-[2.75rem] items-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-accent-fg transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {pending && <Spinner />}
              {pending ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
