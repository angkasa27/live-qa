"use client";

import { useState, useTransition } from "react";
import Segmented from "@/components/admin/Segmented";
import { updateEvent } from "@/lib/actions";
import type { Event, EventStatus } from "@/lib/types";

const STATUS = [
  ["scheduled", "Akan datang"],
  ["live", "Berlangsung"],
  ["archived", "Arsip"],
] as const satisfies readonly (readonly [EventStatus, string])[];

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
 * operator is reading questions, not flipping switches. The summary is driven by the same
 * optimistic copy as the controls, so it never disagrees with them.
 */
export default function EventControls({ event }: { event: Event }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Optimistic local copy so the segmented controls don't lag a round trip behind the tap.
  const [local, setLocal] = useState(event);

  function apply(patch: Parameters<typeof updateEvent>[1]) {
    setLocal((prev) => ({
      ...prev,
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.moderation ? { moderation: patch.moderation } : {}),
      ...(patch.publicArchive != null ? { publicArchive: patch.publicArchive } : {}),
      // null means "go back to following the status", so the effective value has to be read
      // off the status this patch lands on: the one being set, or the current one.
      ...("acceptingQuestions" in patch
        ? {
            acceptingQuestions:
              patch.acceptingQuestions ?? (patch.status ?? prev.status) === "live",
          }
        : {}),
    }));
    setError(null);
    start(async () => {
      const res = await updateEvent(event.id, patch);
      if (!res.ok) {
        setLocal(event); // the server is still the truth
        setError(res.error);
      }
    });
  }

  // Questions normally follow the status; an explicit override is what keeps a finished session
  // taking them. Showing the resolved value rather than the raw column avoids a control that
  // reads "off" while the event is in fact open.
  const openByStatus = local.status === "live";
  const overridden = local.acceptingQuestions !== openByStatus;
  const summary = [
    STATUS.find(([s]) => s === local.status)![1],
    local.acceptingQuestions ? "terbuka" : "tertutup",
    local.moderation === "manual" ? "review manual" : "review otomatis",
  ].join(" · ");

  return (
    <details className="group rounded-xl border border-border bg-surface" aria-busy={pending}>
      <summary className="flex min-h-[3.25rem] cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-medium">Pengaturan</span>
          <span className="block truncate text-xs text-muted">{summary}</span>
        </span>
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
            value={local.status}
            options={STATUS}
            onChange={(status) => apply({ status })}
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
            value={local.acceptingQuestions ? "open" : "closed"}
            options={[
              ["open", "Buka"],
              ["closed", "Tutup"],
            ]}
            onChange={(v) => apply({ acceptingQuestions: v === "open" })}
          />
          {overridden && (
            <button
              onClick={() => apply({ acceptingQuestions: null })}
              className="mt-2 min-h-[2.25rem] text-sm font-medium text-accent underline underline-offset-4"
            >
              Ikuti status lagi
            </button>
          )}
        </Setting>

        <Setting
          label="Review pertanyaan"
          hint={
            local.moderation === "manual"
              ? "Pertanyaan baru menunggu persetujuan sebelum tampil."
              : "Pertanyaan baru langsung tampil."
          }
        >
          <Segmented
            label="Review pertanyaan"
            value={local.moderation}
            options={[
              ["auto", "Otomatis"],
              ["manual", "Manual"],
            ]}
            onChange={(moderation) => apply({ moderation })}
          />
        </Setting>

        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
      </div>
    </details>
  );
}
