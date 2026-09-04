"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CoverField from "@/components/admin/CoverField";
import DateTimeField from "@/components/admin/DateTimeField";
import Field from "@/components/admin/Field";
import FormSection from "@/components/admin/FormSection";
import Segmented from "@/components/admin/Segmented";
import Spinner from "@/components/Spinner";
import VideoField from "@/components/admin/VideoField";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createEvent } from "@/lib/actions";
import { isoToLocal, localToIso, parseVideoId, slugDraft, slugify } from "@/lib/types";

export default function NewEventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  // The address follows the name until someone types in it, then it is theirs. Tracking that
  // with a flag rather than comparing to slugify(name) means clearing the box keeps it cleared
  // instead of snapping back to the name on the next keystroke.
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [startsAt, setStartsAt] = useState(() => isoToLocal(new Date().toISOString()));
  const [venue, setVenue] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [moderation, setModeration] = useState<"auto" | "manual">("auto");
  const [video, setVideo] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const videoId = video.trim() ? parseVideoId(video.trim()) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const startsAtIso = localToIso(startsAt);
    if (!startsAtIso) {
      return setError("Tanggal dan waktu belum lengkap.");
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createEvent({
        name,
        startsAt: startsAtIso,
        venue,
        speaker,
        // A new session is always scheduled. Going live is a deliberate act taken from the
        // session's own controls, not a dropdown chosen while typing the venue.
        status: "scheduled",
        moderation,
        video,
        image,
        slug: slug || undefined,
      });
      if (!res.ok) return setError(res.error);
      router.push(`/admin/events/${res.data.id}`);
    } catch {
      setError("Gagal membuat majelis. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4">
        <Field
          id="name"
          label="Nama sesi"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
          placeholder="mis. Kajian Ahad Pagi: Adab Menuntut Ilmu"
        />

        <Field
          id="slug"
          label="Alamat sesi"
          value={slug}
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(slugDraft(e.target.value));
          }}
          placeholder="kajian-ahad-pagi"
          hint="Bagian akhir tautan yang dibagikan. Ikut nama sesi sampai Anda mengubahnya."
        >
          <p className="mt-1 truncate font-mono text-xs text-faint">
            /events/{slug || "…"}
          </p>
        </Field>

        <DateTimeField value={startsAt} onChange={setStartsAt} />

        <Field
          id="venue"
          label="Tempat"
          required
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="mis. Masjid Al-Ikhlas, Bandung"
        />

        <Field
          id="speaker"
          label="Pemateri"
          required
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
          placeholder="mis. Ust. Abdul Hakim"
        />

        <FormSection label="Opsional" />

        <CoverField
          value={image}
          onChange={setImage}
          fallback={videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null}
        />

        <VideoField value={video} onChange={setVideo} />

        <div>
          <p className="mb-1.5 text-sm font-medium">Mode review awal</p>
          <Segmented
            label="Mode review awal"
            value={moderation}
            options={[
              ["auto", "Otomatis"],
              ["manual", "Manual"],
            ]}
            onChange={setModeration}
            activeClassName={
              moderation === "manual" ? "bg-warn text-white" : "bg-foreground text-background"
            }
          />
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {moderation === "manual"
              ? "Pertanyaan menunggu disetujui sebelum tampil. Bisa diubah kapan saja."
              : "Pertanyaan langsung tampil. Bisa diubah kapan saja."}
          </p>
        </div>

        <div aria-live="polite">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border-soft bg-background/90 px-4 pt-3 backdrop-blur sm:-mx-6 sm:px-6 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {busy && <Spinner />}
          {busy ? "Menyimpan…" : "Simpan sesi"}
        </button>
      </div>
    </form>
  );
}
