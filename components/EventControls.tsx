"use client";

import { ExternalLink, Pencil, Presentation, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Segmented from "@/components/admin/Segmented";
import Spinner from "@/components/Spinner";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { updateEvent } from "@/lib/actions";
import type { Event, EventStatus } from "@/lib/types";

const STATUS = [
  ["scheduled", "Terjadwal"],
  ["live", "Berlangsung"],
  ["archived", "Arsip"],
] as const satisfies readonly (readonly [EventStatus, string])[];

/** Just the settings this panel owns. `accepting` is the raw column: null = follow the status. */
type Draft = {
  status: EventStatus;
  accepting: boolean | null;
  moderation: "auto" | "manual";
  hidden: boolean;
};

const draftOf = (e: Event): Draft => ({
  status: e.status,
  // getEvent resolves accepting_questions through coalesce, so the raw null is not on the wire.
  // It is recoverable: an event whose resolved value already matches its status is following it.
  accepting: e.acceptingQuestions === (e.status === "live") ? null : e.acceptingQuestions,
  moderation: e.moderation,
  hidden: e.hidden,
});

/** Whether questions are open, given a draft. One expression, mirroring accepting_questions(). */
const isOpen = (d: Draft) => d.accepting ?? d.status === "live";

/** A labelled switch row. Two of these, and both are reversible with one tap. */
function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-3.5 py-2.5">
      <span className="min-w-0">
        <span className="block text-[0.9375rem] font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/**
 * Session controls, behind a button rather than on the screen: during a majelis the operator
 * is reading questions, not flipping switches, and REQUIREMENTS.md A5 says these must not
 * compete with the queue for attention.
 *
 * Nothing here writes until Simpan. An earlier version saved on every tap, which meant one
 * mis-aimed thumb could archive a running majelis with no undo. The trigger shows a dot while
 * a change is pending, so a closed sheet still admits it is holding something unsaved.
 */
export default function EventControls({ event }: { event: Event }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => draftOf(event));

  const saved = draftOf(event);
  const dirty =
    draft.status !== saved.status ||
    draft.accepting !== saved.accepting ||
    draft.moderation !== saved.moderation ||
    draft.hidden !== saved.hidden;

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
        hidden: draft.hidden,
      });
      if (!res.ok) return setError(res.error);
      router.refresh(); // the server is the truth; `saved` re-derives from the fresh event
      setOpen(false);
    });
  }

  const openNow = isOpen(draft);
  const openByStatus = draft.status === "live";
  const overridden = draft.accepting !== null;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        className="relative flex min-h-9 items-center gap-1.5 rounded-lg border border-[#4a453d] px-3 text-[0.8125rem] font-semibold text-[#e8e5df] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8e5df]"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Pengaturan
        {dirty && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-warn-pill" aria-hidden />
        )}
      </DrawerTrigger>

      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="flex flex-row items-center justify-between gap-3 border-b border-border pb-3">
          <DrawerTitle className="text-lg font-semibold">Kendali sesi</DrawerTitle>
          <DrawerClose className="min-h-9 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Tutup
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <section>
            <h3 className="mb-2 text-sm font-medium">Status sesi</h3>
            <Segmented
              label="Status sesi"
              value={draft.status}
              options={STATUS}
              onChange={(status) => set({ status })}
              activeClassName="bg-foreground text-background"
            />
          </section>

          <div className="divide-y divide-border-soft rounded-xl border border-border bg-card">
            <Toggle
              label="Terima pertanyaan"
              hint={
                overridden
                  ? "Diatur manual, tidak mengikuti status sesi."
                  : `Mengikuti status sesi: ${openByStatus ? "terbuka" : "tertutup"}.`
              }
              checked={openNow}
              onChange={(v) => set({ accepting: v })}
            />
            <Toggle
              label="Arsip dapat diakses publik"
              hint="Lewat tautan, tidak diindeks."
              checked={!draft.hidden}
              onChange={(v) => set({ hidden: !v })}
            />
          </div>

          {overridden && (
            <button
              type="button"
              onClick={() => set({ accepting: null })}
              className="min-h-9 text-sm font-medium text-primary underline underline-offset-4"
            >
              Ikuti status sesi lagi
            </button>
          )}

          <section>
            <h3 className="mb-2 text-sm font-medium">Mode review</h3>
            <Segmented
              label="Mode review"
              value={draft.moderation}
              options={[
                ["auto", "Otomatis"],
                ["manual", "Manual"],
              ]}
              onChange={(moderation) => set({ moderation })}
              activeClassName={
                draft.moderation === "manual" ? "bg-warn text-white" : "bg-foreground text-background"
              }
            />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {draft.moderation === "manual"
                ? "Manual: pertanyaan menunggu disetujui. Ganti ke otomatis bila antrean menumpuk."
                : "Otomatis: pertanyaan langsung tampil. Ganti ke manual bila perlu disaring."}
            </p>
          </section>

          {/* The other two things this majelis can do, kept off the queue screen. */}
          <section className="border-t border-border-soft pt-4">
            <h3 className="mb-2 text-sm font-medium">Sesi ini</h3>
            <div className="grid gap-2">
              <SheetLink href={`/admin/events/${event.id}/edit`} icon={<Pencil className="h-4 w-4" />}>
                Ubah detail sesi
              </SheetLink>
              <SheetLink
                href={`/admin/events/${event.id}/speaker`}
                icon={<Presentation className="h-4 w-4" />}
              >
                Layar pemateri
              </SheetLink>
              <SheetLink
                href={`/events/${event.id}`}
                external
                icon={<ExternalLink className="h-4 w-4" />}
              >
                Lihat halaman jamaah
              </SheetLink>
            </div>
          </section>

          <div aria-live="polite">
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
        </div>

        <div className="shrink-0 border-t border-border p-4 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {pending && <Spinner />}
            {pending ? "Menyimpan…" : dirty ? "Simpan perubahan" : "Tidak ada perubahan"}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SheetLink({
  href,
  external,
  icon,
  children,
}: {
  href: string;
  external?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const className =
    "flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 text-[0.9375rem] font-medium transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const inner = (
    <>
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
