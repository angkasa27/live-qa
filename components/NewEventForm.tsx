"use client";

import { Image as ImageIcon, MapPin, Tag, User, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import CoverField from "@/components/admin/CoverField";
import DateTimeField from "@/components/admin/DateTimeField";
import VideoField from "@/components/admin/VideoField";
import PageShell from "@/components/PageShell";
import Spinner from "@/components/Spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createEvent } from "@/lib/actions";
import { eventUrlPrefix, useSiteOrigin } from "@/lib/site";
import { isoToLocal, localToIso, parseVideoId, slugDraft } from "@/lib/types";

/**
 * Four facts and a name. Everything else about a session is set later, from the session
 * itself: a majelis is always created scheduled, and going live is a deliberate act taken
 * from its own controls — never a dropdown chosen while typing the venue.
 */
export default function NewEventForm() {
  const router = useRouter();
  const origin = useSiteOrigin();
  const [name, setName] = useState("");
  // The address follows the name until someone types in it, then it is theirs. Tracking that
  // with a flag rather than comparing to slugify(name) means clearing the box keeps it cleared
  // instead of snapping back to the name on the next keystroke.
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [startsAt, setStartsAt] = useState(() => isoToLocal(new Date().toISOString()));
  const [venue, setVenue] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [video, setVideo] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const videoId = video.trim() ? parseVideoId(video.trim()) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const startsAtIso = localToIso(startsAt);
    if (!startsAtIso) return setError("Tanggal dan waktu belum lengkap.");

    setBusy(true);
    setError(null);
    try {
      const res = await createEvent({
        name,
        startsAt: startsAtIso,
        venue,
        speaker,
        status: "scheduled",
        // Review mode is a live control now; it lives on the board with the other thing an
        // operator flips mid-majelis. New sessions start on the safe side of it.
        moderation: "manual",
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
      <PageShell
        action={
          <Button type="submit" size="lg" disabled={busy}>
            {busy && <Spinner />}
            {busy ? "Membuat…" : "Buat sesi"}
          </Button>
        }
      >
        <Field className="gap-2">
          <FieldLabel htmlFor="name">
            <Tag aria-hidden />
            Nama sesi
          </FieldLabel>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugDraft(e.target.value));
            }}
            placeholder="mis. Kajian Ahad Pagi: Adab Menuntut Ilmu"
          />
        </Field>

        <div className="mt-4">
          <DateTimeField value={startsAt} onChange={setStartsAt} />
        </div>

        <Field className="mt-4 gap-2">
          <FieldLabel htmlFor="venue">
            <MapPin aria-hidden />
            Tempat
          </FieldLabel>
          <Input
            id="venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="mis. Masjid Al-Ikhlas, Bandung"
          />
        </Field>

        <Field className="mt-4 gap-2">
          <FieldLabel htmlFor="speaker">
            <User aria-hidden />
            Pemateri
          </FieldLabel>
          <Input
            id="speaker"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            placeholder="mis. Ustadz Abdul Hakim"
          />
        </Field>

        <Field className="mt-4 gap-2">
          <FieldLabel>
            <ImageIcon aria-hidden />
            Poster <span className="font-normal text-muted-foreground">— boleh dikosongkan</span>
          </FieldLabel>
          <CoverField
            value={image}
            onChange={setImage}
            fallback={videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null}
          />
        </Field>

        <p className="mt-6 border-t border-border-soft pt-4.5 text-sm font-bold text-muted-foreground">
          Setelah majelis
        </p>

        <Field className="mt-3 gap-2">
          <FieldLabel htmlFor="video">
            <Video aria-hidden />
            Rekaman YouTube
          </FieldLabel>
          <VideoField value={video} onChange={setVideo} />
          <FieldDescription>Sual membaca takarirnya dan mengusulkan jawaban.</FieldDescription>
        </Field>

        <p className="mt-6 border-t border-border-soft pt-4.5 text-sm font-bold text-muted-foreground">
          Alamat halaman
        </p>

        <div className="mt-3 flex min-h-12 items-center overflow-hidden rounded-sm border-[1.5px] border-input bg-card focus-within:border-ring">
          <span className="shrink-0 pl-3.5 text-base whitespace-nowrap text-faint">
            {eventUrlPrefix(origin)}
          </span>
          <input
            id="slug"
            value={slug}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            inputMode="url"
            aria-label="Alamat halaman"
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(slugDraft(e.target.value));
            }}
            placeholder="kajian-ahad-pagi"
            className="min-h-12 min-w-0 flex-1 border-0 bg-transparent py-0 pr-3.5 pl-px text-base outline-none placeholder:text-faint"
          />
        </div>
        <FieldDescription className="mt-1.5">
          Terisi dari nama sesi — ubah sekarang kalau perlu. Setelah sesi dibuat alamat ini
          dikunci, karena QR yang sudah dicetak harus tetap hidup.
        </FieldDescription>

        <div aria-live="polite">
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </PageShell>
    </form>
  );
}
