"use client";

import { SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import CoverField from "@/components/admin/CoverField";
import DateTimeField from "@/components/admin/DateTimeField";
import Field from "@/components/admin/Field";
import FormSection from "@/components/admin/FormSection";
import Segmented from "@/components/admin/Segmented";
import VideoField from "@/components/admin/VideoField";
import Spinner from "@/components/Spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { deleteEvent, updateEvent } from "@/lib/actions";
import { isoToLocal, parseVideoId, type Event, type EventStatus } from "@/lib/types";

const STATUS = [
  ["scheduled", "Terjadwal"],
  ["live", "Berlangsung"],
  ["archived", "Arsip"],
] as const satisfies readonly (readonly [EventStatus, string])[];

/**
 * Everything a session is, in one draft. Both halves save together because they are one
 * question — "what is this session?" — that was previously split across a drawer and a
 * separate page for no reason a user could see.
 */
type Draft = {
  status: EventStatus;
  accepting: boolean | null;
  moderation: "auto" | "manual";
  hidden: boolean;
  name: string;
  startsAt: string;
  venue: string;
  speaker: string;
  video: string;
  image: string;
};

const draftOf = (e: Event): Draft => ({
  status: e.status,
  // getEvent resolves accepting_questions through coalesce, so the raw null is not on the wire.
  // It is recoverable: an event whose resolved value already matches its status is following it.
  accepting: e.acceptingQuestions === (e.status === "live") ? null : e.acceptingQuestions,
  moderation: e.moderation,
  hidden: e.hidden,
  name: e.name,
  startsAt: isoToLocal(e.startsAt),
  venue: e.venue,
  speaker: e.speaker,
  video: e.youtubeId ?? "",
  image: e.image ?? "",
});

/** Whether questions are open, given a draft. One expression, mirroring accepting_questions(). */
const isOpen = (d: Draft) => d.accepting ?? d.status === "live";

/** A labelled switch row. Both of these are reversible with one tap. */
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
 * The one place a session is configured.
 *
 * It used to be three: a drawer for the four runtime controls, a separate route for the
 * descriptive fields, and deletion buried at the bottom of that route. Nothing about the
 * split matched how anyone thinks about a session — "change the venue" and "stop taking
 * questions" are the same errand — and the drawer had grown links out to the other two,
 * which is a settings screen admitting it is not the settings screen.
 *
 * Navigation is deliberately absent. The speaker screen and the public page are places to
 * go, not things to set, and they live in the header where actions belong.
 *
 * Nothing writes until Simpan. An earlier version saved on every tap, which meant one
 * mis-aimed thumb could archive a running majelis with no undo. The trigger carries a dot
 * while a change is pending, so a closed sheet still admits it is holding something unsaved.
 */
export default function SessionSettings({
  event,
  questionCount,
}: {
  event: Event;
  questionCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => draftOf(event));
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const saved = draftOf(event);
  const dirty = (Object.keys(saved) as (keyof Draft)[]).some((k) => draft[k] !== saved[k]);

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  };

  function save() {
    setError(null);
    if (Number.isNaN(Date.parse(draft.startsAt))) {
      return setError("Tanggal dan waktu belum lengkap.");
    }
    start(async () => {
      const res = await updateEvent(event.id, {
        status: draft.status,
        acceptingQuestions: draft.accepting,
        moderation: draft.moderation,
        hidden: draft.hidden,
        details: {
          name: draft.name,
          // The picker gives local time with no zone; the server stores timestamptz.
          startsAt: new Date(draft.startsAt).toISOString(),
          venue: draft.venue,
          speaker: draft.speaker,
          video: draft.video,
          image: draft.image,
        },
      });
      if (!res.ok) return setError(res.error);
      router.refresh(); // the server is the truth; `saved` re-derives from the fresh event
      setOpen(false);
    });
  }

  async function remove() {
    setDeleting(true);
    setError(null);
    const res = await deleteEvent(event.id);
    if (!res.ok) {
      setDeleting(false);
      return setError(res.error);
    }
    // Deliberately stays busy: the event is gone, so this component is about to unmount and
    // re-enabling the button would only offer a second delete of nothing.
    router.push("/admin");
  }

  const openNow = isOpen(draft);
  const overridden = draft.accepting !== null;
  const videoId = draft.video.trim() ? parseVideoId(draft.video.trim()) : null;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        aria-label="Pengaturan sesi"
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-[#e8e5df] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8e5df]"
      >
        <SlidersHorizontal className="h-5 w-5" aria-hidden />
        {dirty && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-warn-pill" aria-hidden />
        )}
      </DrawerTrigger>

      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="flex flex-row items-center justify-between gap-3 border-b border-border pb-3">
          <DrawerTitle className="text-lg font-semibold">Pengaturan sesi</DrawerTitle>
          <DrawerClose className="min-h-9 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Tutup
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {/* What the session is doing right now. Touched mid-majelis, so it comes first. */}
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
                  : `Mengikuti status sesi: ${draft.status === "live" ? "terbuka" : "tertutup"}.`
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

          {/* What the session is. Same errand, same sheet, same Simpan. */}
          <FormSection label="Detail sesi" />

          <Field
            id="name"
            label="Nama sesi"
            required
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            hint="Alamat sesi tidak ikut berubah, tautan yang sudah dibagikan tetap berfungsi."
          />

          <DateTimeField value={draft.startsAt} onChange={(startsAt) => set({ startsAt })} />

          <Field
            id="venue"
            label="Tempat"
            required
            value={draft.venue}
            onChange={(e) => set({ venue: e.target.value })}
          />

          <Field
            id="speaker"
            label="Pemateri"
            required
            value={draft.speaker}
            onChange={(e) => set({ speaker: e.target.value })}
          />

          <CoverField
            value={draft.image}
            onChange={(image) => set({ image })}
            fallback={videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null}
          />

          <VideoField value={draft.video} onChange={(video) => set({ video })} />

          {/* The only destructive control in the app. Its own section, at the end, behind the
              session's own name typed out — see ROADMAP.md §6 on why nothing else deletes. */}
          <FormSection label="Hapus sesi" />

          {confirming ? (
            <div className="space-y-2.5 rounded-xl border border-destructive-border bg-destructive-soft p-3.5">
              <p className="text-sm leading-relaxed text-destructive">
                Menghapus sesi ini beserta{" "}
                <strong className="font-bold">{questionCount} pertanyaan</strong> dan seluruh
                riwayat jawabannya. Tidak bisa dibatalkan.
              </p>
              <Label htmlFor="confirm-name" className="block text-sm leading-relaxed">
                Ketik <span className="font-semibold">{event.name}</span> untuk melanjutkan
              </Label>
              <Input
                id="confirm-name"
                value={typed}
                autoComplete="off"
                onChange={(e) => setTyped(e.target.value)}
              />
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setTyped("");
                  }}
                  disabled={deleting}
                  className="min-h-11 flex-1 rounded-xl border border-border bg-card text-sm font-semibold disabled:opacity-40"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={typed.trim() !== event.name.trim() || deleting}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-white disabled:opacity-40"
                >
                  {deleting ? <Spinner /> : <Trash2 className="h-4 w-4" aria-hidden />}
                  {deleting ? "Menghapus…" : "Hapus"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive-border text-sm font-semibold text-destructive transition-colors hover:bg-destructive-soft"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Hapus sesi
            </button>
          )}

          <div aria-live="polite">
            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
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
