"use client";

import { Image as ImageIcon, Lock, MapPin, Tag, Trash2, User, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import Confirm from "@/components/admin/Confirm";
import CoverField from "@/components/admin/CoverField";
import DateTimeField from "@/components/admin/DateTimeField";
import VideoField from "@/components/admin/VideoField";
import PageShell from "@/components/PageShell";
import Spinner from "@/components/Spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteEvent, updateEvent } from "@/lib/actions";
import { eventUrlPrefix, useSiteOrigin } from "@/lib/site";
import { isoToLocal, localToIso, parseVideoId, type Event } from "@/lib/types";

/**
 * What a session *is*, as opposed to what it is doing.
 *
 * This is what survived the old "Pengaturan" sheet. That sheet held twelve controls behind
 * one icon — status, accepting, moderation, staff, name, slug, time, venue, speaker, cover,
 * video, delete — all of them always, whatever the session was doing. They have been split
 * by WHEN they are needed instead: the two that change mid-majelis are on the board, the
 * status progression is one button under the queue, staffing is a property of a person, and
 * what is left is here — rare, deliberate, and saved together.
 *
 * Nothing writes until Simpan. An earlier version saved on every tap, which meant one
 * mis-aimed thumb could archive a running majelis with no undo.
 */
type Draft = {
  name: string;
  startsAt: string;
  venue: string;
  speaker: string;
  video: string;
  image: string;
  hidden: boolean;
};

const draftOf = (e: Event): Draft => ({
  name: e.name,
  startsAt: isoToLocal(e.startsAt),
  venue: e.venue,
  speaker: e.speaker,
  video: e.youtubeId ?? "",
  image: e.image ?? "",
  hidden: e.hidden,
});

export default function EditSessionForm({
  event,
  questionCount,
}: {
  event: Event;
  questionCount: number;
}) {
  const router = useRouter();
  const origin = useSiteOrigin();
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

  const videoId = draft.video.trim() ? parseVideoId(draft.video.trim()) : null;

  function save() {
    setError(null);
    if (!localToIso(draft.startsAt)) return setError("Tanggal dan waktu belum lengkap.");

    start(async () => {
      const res = await updateEvent(event.id, {
        hidden: draft.hidden,
        details: {
          name: draft.name,
          // The address is locked after creation, so it is sent back exactly as it came.
          slug: event.id,
          startsAt: localToIso(draft.startsAt)!,
          venue: draft.venue,
          speaker: draft.speaker,
          video: draft.video,
          image: draft.image,
        },
      });
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  async function remove() {
    setDeleting(true);
    const res = await deleteEvent(event.id);
    if (!res.ok) {
      setDeleting(false);
      setConfirming(false);
      return setError(res.error);
    }
    // Deliberately stays busy: the event is gone, so this component is about to unmount and
    // re-enabling the button would only offer a second delete of nothing.
    router.push("/admin");
  }

  return (
    <PageShell
      action={
        <Button size="lg" disabled={!dirty || pending} onClick={save}>
          {pending && <Spinner />}
          {pending ? "Menyimpan…" : dirty ? "Simpan" : "Tidak ada perubahan"}
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
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="mis. Kajian Ahad Pagi: Adab Menuntut Ilmu"
        />
      </Field>

      <div className="mt-4">
        <DateTimeField value={draft.startsAt} onChange={(startsAt) => set({ startsAt })} />
      </div>

      <Field className="mt-4 gap-2">
        <FieldLabel htmlFor="venue">
          <MapPin aria-hidden />
          Tempat
        </FieldLabel>
        <Input
          id="venue"
          value={draft.venue}
          onChange={(e) => set({ venue: e.target.value })}
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
          value={draft.speaker}
          onChange={(e) => set({ speaker: e.target.value })}
          placeholder="mis. Ustadz Abdul Hakim"
        />
      </Field>

      <Field className="mt-4 gap-2">
        <FieldLabel>
          <ImageIcon aria-hidden />
          Poster <span className="font-normal text-muted-foreground">— boleh dikosongkan</span>
        </FieldLabel>
        <CoverField
          value={draft.image}
          onChange={(image) => set({ image })}
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
        <VideoField value={draft.video} onChange={(video) => set({ video })} />
        <FieldDescription>Sual membaca takarirnya dan mengusulkan jawaban.</FieldDescription>
      </Field>

      <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3 text-md">
        <Checkbox checked={!draft.hidden} onCheckedChange={(v) => set({ hidden: !v })} />
        Arsip dapat diakses publik
      </label>
      <FieldDescription>Lewat tautan, tidak diindeks mesin pencari.</FieldDescription>

      <p className="mt-6 border-t border-border-soft pt-4.5 text-sm font-bold text-muted-foreground">
        Alamat halaman
      </p>

      {/* Locked, and shown rather than hidden: an operator looking for "where do I change the
          link" needs to find the answer, not the absence of a field. */}
      <p className="mt-3 flex min-h-12 items-center gap-2.5 rounded-sm border-[1.5px] border-dashed border-border bg-background px-3.5 text-md text-muted-foreground">
        <Lock className="size-4 shrink-0 stroke-faint stroke-[1.9]" aria-hidden />
        <span className="min-w-0 truncate">
          {eventUrlPrefix(origin)}
          <strong className="font-semibold text-foreground">{event.id}</strong>
        </span>
      </p>
      <FieldDescription>Dikunci. QR yang sudah dicetak mengarah ke sini.</FieldDescription>

      {/* The only destructive control in the app. Its own section, at the end, behind the
          session's own name typed out — see ROADMAP.md §6 on why nothing else deletes. */}
      <div className="mt-6 border-t border-border-soft pt-4.5">
        <Button variant="destructive" size="lg" onClick={() => setConfirming(true)}>
          <Trash2 aria-hidden />
          Hapus sesi ini
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {questionCount} pertanyaan ikut terhapus. Tidak bisa dibatalkan.
        </p>
      </div>

      <Confirm
        open={confirming}
        onOpenChange={(v) => {
          if (deleting) return;
          setConfirming(v);
          if (!v) setTyped("");
        }}
        title="Hapus sesi ini?"
        description={
          <>
            Menghapus sesi ini beserta{" "}
            <strong className="font-bold text-destructive">{questionCount} pertanyaan</strong> dan
            seluruh riwayat jawabannya. Tidak bisa dibatalkan.
          </>
        }
        confirmLabel="Hapus sesi"
        busyLabel="Menghapus…"
        busy={deleting}
        disabled={typed.trim() !== event.name.trim()}
        onConfirm={remove}
      >
        <div className="space-y-1.5">
          <Label htmlFor="confirm-name" className="block">
            Ketik <span className="font-bold">{event.name}</span> untuk melanjutkan
          </Label>
          <Input
            id="confirm-name"
            value={typed}
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
      </Confirm>

      <div aria-live="polite">
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </PageShell>
  );
}
