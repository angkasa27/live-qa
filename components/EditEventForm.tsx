"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import DeleteEventDialog from "@/components/DeleteEventDialog";
import CoverField from "@/components/admin/CoverField";
import DateTimeField from "@/components/admin/DateTimeField";
import Field from "@/components/admin/Field";
import FormSection from "@/components/admin/FormSection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check } from "lucide-react";
import Spinner from "@/components/Spinner";
import VideoField from "@/components/admin/VideoField";
import { updateEvent } from "@/lib/actions";
import { isoToLocal, parseVideoId, type Event } from "@/lib/types";

/** What the form edits, as strings. Comparing this object to its initial value is the dirty check. */
type Draft = {
  name: string;
  startsAt: string;
  venue: string;
  speaker: string;
  video: string;
  image: string;
};

const draftOf = (e: Event): Draft => ({
  name: e.name,
  startsAt: isoToLocal(e.startsAt),
  venue: e.venue,
  speaker: e.speaker,
  video: e.youtubeId ?? "",
  image: e.image ?? "",
});

/**
 * The descriptive fields. Status and moderation stay on the event board in <EventControls>,
 * because they are touched during a session and these are not.
 */
export default function EditEventForm({
  event,
  questionCount,
}: {
  event: Event;
  questionCount: number;
}) {
  const router = useRouter();
  const initial = draftOf(event);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = (Object.keys(initial) as (keyof Draft)[]).some((k) => draft[k] !== initial[k]);
  const videoId = draft.video.trim() ? parseVideoId(draft.video.trim()) : null;
  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await updateEvent(event.id, {
        details: {
          ...draft,
          // The picker gives local time with no zone; the server stores timestamptz.
          startsAt: new Date(draft.startsAt).toISOString(),
        },
      });
      if (!res.ok) return setError(res.error);
      setSaved(true);
      // Match what the server actually stored, or the form never goes clean again: it trims the
      // text fields and keeps only the video *id*, so a pasted "https://youtu.be/xyz" comes back
      // as "xyz" and would read as an unsaved edit forever.
      setDraft((d) => ({
        name: d.name.trim(),
        startsAt: d.startsAt,
        venue: d.venue.trim(),
        speaker: d.speaker.trim(),
        video: parseVideoId(d.video) ?? "",
        image: d.image.trim(),
      }));
      // The server is the truth now: re-render this route so `initial` picks up what was saved.
      router.refresh();
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <Field
          id="name"
          label="Nama sesi"
          required
          value={draft.name}
          onChange={(e) => set("name")(e.target.value)}
          hint="Alamat sesi tidak ikut berubah, tautan yang sudah dibagikan tetap berfungsi."
        />

        <DateTimeField value={draft.startsAt} onChange={set("startsAt")} />

        <Field
          id="venue"
          label="Tempat"
          required
          value={draft.venue}
          onChange={(e) => set("venue")(e.target.value)}
        />

        <Field
          id="speaker"
          label="Pemateri"
          required
          value={draft.speaker}
          onChange={(e) => set("speaker")(e.target.value)}
        />

        <FormSection label="Opsional" />

        <CoverField
          value={draft.image}
          onChange={set("image")}
          fallback={videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null}
        />

        <VideoField value={draft.video} onChange={set("video")} />

        <div aria-live="polite">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && !dirty && <p className="text-sm text-muted-foreground">Tersimpan.</p>}
        </div>

        <button
          type="submit"
          disabled={!dirty || busy}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {busy ? <Spinner /> : <Check className="h-[18px] w-[18px]" aria-hidden />}
          {busy ? "Menyimpan…" : "Simpan perubahan"}
        </button>
      </form>

      {/* A sibling of the form, not a child: the confirm dialog has its own text input, and
          pressing Enter in it must never submit the edit form behind it. */}
      <section className="mt-8 rounded-xl border border-destructive-border bg-card">
        <h2 className="border-b border-destructive-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-destructive">
          Zona berbahaya
        </h2>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Menghapus majelis ini beserta seluruh pertanyaan dan riwayat jawabannya.
          </p>
          <DeleteEventDialog event={event} questionCount={questionCount} />
        </div>
      </section>
    </>
  );
}
