"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Card from "@/components/admin/Card";
import Field from "@/components/admin/Field";
import Segmented from "@/components/admin/Segmented";
import Spinner from "@/components/Spinner";
import VideoField from "@/components/admin/VideoField";
import { createEvent } from "@/lib/actions";
import { isoToLocal, type EventStatus } from "@/lib/types";

export default function NewEventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState(() => isoToLocal(new Date().toISOString()));
  const [venue, setVenue] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [status, setStatus] = useState<EventStatus>("scheduled");
  const [moderation, setModeration] = useState<"auto" | "manual">("auto");
  const [video, setVideo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createEvent({
        name,
        // The picker gives local time with no zone; the server stores timestamptz.
        startsAt: new Date(startsAt).toISOString(),
        venue,
        speaker,
        status,
        moderation,
        video,
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
    <form onSubmit={submit} className="space-y-4">
      <Card title="Majelis">
        <Field
          id="name"
          label="Nama majelis"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Kajian Ahad Pagi Kitab Tauhid"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="speaker"
            label="Pemateri"
            required
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            placeholder="mis. Ustadz Ahmad"
          />
          <Field
            id="venue"
            label="Tempat"
            required
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="mis. Masjid Al-Ikhlas"
          />
        </div>

        <Field
          id="startsAt"
          label="Waktu mulai"
          type="datetime-local"
          required
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </Card>

      <Card title="Pengaturan">
        <div>
          <p className="text-sm font-medium">Status</p>
          <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
            Pertanyaan hanya diterima saat berlangsung. Bisa diubah kapan saja setelah dibuat.
          </p>
          <Segmented
            label="Status"
            value={status}
            options={[["scheduled", "Akan datang"], ["live", "Berlangsung"], ["archived", "Arsip"]]}
            onChange={setStatus}
          />
        </div>

        <div>
          <p className="text-sm font-medium">Review pertanyaan</p>
          <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
            Manual berarti setiap pertanyaan menunggu persetujuan admin sebelum tampil.
          </p>
          <Segmented
            label="Review pertanyaan"
            value={moderation}
            options={[["auto", "Otomatis"], ["manual", "Manual"]]}
            onChange={setModeration}
          />
        </div>

        <VideoField value={video} onChange={setVideo} />
      </Card>

      <div aria-live="polite" className="min-h-[1.25rem]">
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </div>

      <button type="submit" disabled={busy}
        className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {busy && <Spinner />}
        {busy ? "Membuat…" : "Buat majelis"}
      </button>
    </form>
  );
}
