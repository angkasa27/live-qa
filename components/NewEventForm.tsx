"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEvent } from "@/lib/actions";
import { parseVideoId, type EventStatus } from "@/lib/types";

const INPUT =
  "mt-2 min-h-[2.75rem] w-full rounded-lg border border-border bg-surface px-3 outline-none transition-colors placeholder:text-muted focus:border-accent";

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time, which toISOString() will not give. */
function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset(), 0, 0);
  return d.toISOString().slice(0, 16);
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
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">Nama majelis</label>
        <input id="name" required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="mis. Kajian Ahad Pagi — Kitab Tauhid" className={INPUT} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
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

      <fieldset>
        <legend className="text-sm font-medium">Status</legend>
        <p className="mt-1 text-xs text-muted">
          Pertanyaan hanya diterima saat berlangsung. Bisa diubah kapan saja setelah dibuat.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {([["scheduled", "Akan datang"], ["live", "Berlangsung"], ["archived", "Arsip"]] as const).map(
            ([value, label]) => (
              <label key={value}
                className={`flex min-h-[2.75rem] cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium ${
                  status === value ? "border-accent bg-accent text-accent-fg" : "border-border text-muted"
                }`}>
                <input type="radio" name="status" value={value} checked={status === value}
                  onChange={() => setStatus(value)} className="sr-only" />
                {label}
              </label>
            ),
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Review pertanyaan</legend>
        <p className="mt-1 text-xs text-muted">
          Manual berarti setiap pertanyaan menunggu persetujuan admin sebelum tampil.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {([["auto", "Otomatis"], ["manual", "Manual"]] as const).map(([value, label]) => (
            <label key={value}
              className={`flex min-h-[2.75rem] cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium ${
                moderation === value ? "border-accent bg-accent text-accent-fg" : "border-border text-muted"
              }`}>
              <input type="radio" name="moderation" value={value} checked={moderation === value}
                onChange={() => setModeration(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

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

      <div aria-live="polite" className="min-h-[1.25rem]">
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
      </div>

      <button type="submit" disabled={busy}
        className="min-h-[3rem] w-full rounded-xl bg-accent font-semibold text-accent-fg transition-opacity disabled:opacity-40">
        {busy ? "Membuat…" : "Buat majelis"}
      </button>
    </form>
  );
}
