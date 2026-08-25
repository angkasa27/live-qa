"use client";

import { useState, useTransition } from "react";
import { updateEvent } from "@/lib/actions";
import type { Event, EventStatus } from "@/lib/types";

const STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: "Akan datang",
  live: "Berlangsung",
  archived: "Arsip",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[0.9375rem] font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const SEGMENT =
  "min-h-[2.25rem] px-3 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg border border-border -ml-px first:ml-0";

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
      // off the status this patch lands on — the one being set, or the current one.
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

  return (
    <section className="divide-y divide-border rounded-xl border border-border bg-surface" aria-busy={pending}>
      <Field label="Status">
        <div className="flex">
          {(Object.keys(STATUS_LABEL) as EventStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => apply({ status: s })}
              aria-pressed={local.status === s}
              className={`${SEGMENT} ${
                local.status === s ? "border-accent bg-accent text-accent-fg" : "text-muted hover:text-foreground"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Menerima pertanyaan"
        hint={
          overridden
            ? "Diatur manual — tidak mengikuti status."
            : `Mengikuti status: ${openByStatus ? "terbuka selama berlangsung" : "tertutup"}.`
        }
      >
        <div className="flex">
          <button
            onClick={() => apply({ acceptingQuestions: true })}
            aria-pressed={local.acceptingQuestions}
            className={`${SEGMENT} ${local.acceptingQuestions ? "border-accent bg-accent text-accent-fg" : "text-muted"}`}
          >
            Buka
          </button>
          <button
            onClick={() => apply({ acceptingQuestions: false })}
            aria-pressed={!local.acceptingQuestions}
            className={`${SEGMENT} ${!local.acceptingQuestions ? "border-accent bg-accent text-accent-fg" : "text-muted"}`}
          >
            Tutup
          </button>
          {overridden && (
            <button onClick={() => apply({ acceptingQuestions: null })} className={`${SEGMENT} text-muted`}>
              Ikut status
            </button>
          )}
        </div>
      </Field>

      <Field
        label="Review pertanyaan"
        hint={
          local.moderation === "manual"
            ? "Pertanyaan baru menunggu persetujuan sebelum tampil."
            : "Pertanyaan baru langsung tampil."
        }
      >
        <div className="flex">
          <button
            onClick={() => apply({ moderation: "auto" })}
            aria-pressed={local.moderation === "auto"}
            className={`${SEGMENT} ${local.moderation === "auto" ? "border-accent bg-accent text-accent-fg" : "text-muted"}`}
          >
            Otomatis
          </button>
          <button
            onClick={() => apply({ moderation: "manual" })}
            aria-pressed={local.moderation === "manual"}
            className={`${SEGMENT} ${local.moderation === "manual" ? "border-accent bg-accent text-accent-fg" : "text-muted"}`}
          >
            Manual
          </button>
        </div>
      </Field>

      {error && <p className="px-4 py-3 text-sm font-medium text-red-500">{error}</p>}
    </section>
  );
}
