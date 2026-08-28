"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Segmented from "@/components/admin/Segmented";
import { createEvent } from "@/lib/actions";
import { parseVideoId, type EventStatus } from "@/lib/types";

const INPUT =
  "mt-1.5 min-h-[2.75rem] w-full rounded-lg border border-border bg-background px-3 outline-none transition-colors placeholder:text-muted focus:border-accent";

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time, which toISOString() will not give. */
function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset(), 0, 0);
  return d.toISOString().slice(0, 16);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </h2>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

export default function NewEventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState(localNow);
  const [venue, setVenue] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [status, setStatus] = useState<EventStatus>("scheduled");
  const [moderation, setModeration] = useState<"auto" | "manual">("auto");
  const [video, setVideo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Echo back what we understood, so a mistyped link is obvious before it's saved.
  const videoId = video.trim() ? parseVideoId(video) : null;

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
        <div>
          <label htmlFor="name" className="block text-sm font-medium">Nama majelis</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="mis. Kajian Ahad Pagi Kitab Tauhid" className={INPUT} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="speaker" className="block text-sm font-medium">Pemateri</label>
            <input id="speaker" required value={speaker} onChange={(e) => setSpeaker(e.target.value)}
              placeholder="mis. Ustadz Ahmad" className={INPUT} />
          </div>
          <div>
            <label htmlFor="venue" className="block text-sm font-medium">Tempat</label>
            <input id="venue" required value={venue} onChange={(e) => setVenue(e.target.value)}
              placeholder="mis. Masjid Al-Ikhlas" className={INPUT} />
          </div>
        </div>

        <div>
          <label htmlFor="startsAt" className="block text-sm font-medium">Waktu mulai</label>
          <input id="startsAt" type="datetime-local" required value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)} className={INPUT} />
        </div>
      </Card>

      <Card title="Pengaturan">
        <div>
          <p className="text-sm font-medium">Status</p>
          <p className="mb-2 mt-0.5 text-xs text-muted">
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
          <p className="mb-2 mt-0.5 text-xs text-muted">
            Manual berarti setiap pertanyaan menunggu persetujuan admin sebelum tampil.
          </p>
          <Segmented
            label="Review pertanyaan"
            value={moderation}
            options={[["auto", "Otomatis"], ["manual", "Manual"]]}
            onChange={setModeration}
          />
        </div>

        <div>
          <label htmlFor="video" className="block text-sm font-medium">
            Rekaman atau siaran YouTube <span className="font-normal text-muted">(opsional)</span>
          </label>
          <input id="video" value={video} onChange={(e) => setVideo(e.target.value)}
            placeholder="https://youtu.be/…" className={INPUT} />
          {video.trim() && (
            <p className={`mt-1.5 text-xs ${videoId ? "text-muted" : "text-red-500"}`}>
              {videoId ? `Video dikenali: ${videoId}` : "Tautan tidak dikenali."}
            </p>
          )}
        </div>
      </Card>

      <div aria-live="polite" className="min-h-[1.25rem]">
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
      </div>

      <button type="submit" disabled={busy}
        className="min-h-[3rem] w-full rounded-xl bg-accent font-semibold text-accent-fg transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        {busy ? "Membuat…" : "Buat majelis"}
      </button>
    </form>
  );
}
