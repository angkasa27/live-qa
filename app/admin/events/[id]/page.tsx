import { ImageOff } from "lucide-react";
import { notFound } from "next/navigation";
import AdminBoard from "@/components/AdminBoard";
import AdminShell from "@/components/admin/Shell";
import EventControls from "@/components/EventControls";
import { getEvent } from "@/lib/queries";
import { requireSession } from "@/lib/guard";
import { coverFor } from "@/lib/types";

export const dynamic = "force-dynamic";

// Reading a 40-minute recording is a single long Gemini call from a server action on this
// route, and the platform default (60s on Vercel Hobby) is not enough for it.
export const maxDuration = 300;

const STATE = { live: "Live", scheduled: "Terjadwal", archived: "Arsip" } as const;

export default async function AdminEventPage({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  await requireSession(`/admin/events/${id}`);

  const event = await getEvent(id, { includeHidden: true });
  if (!event) notFound();

  const cover = coverFor(event);

  return (
    <AdminShell
      wide
      back={{ href: "/admin", label: "Semua majelis" }}
      title={event.name}
      /* Everything this screen can do that is not answering lives behind one button, so the
         queue keeps the screen. Editing, the speaker screen and the public page are inside
         it too — REQUIREMENTS.md A7 wants the speaker surface opened from the session the
         admin is already running, not found somewhere else. */
      action={<EventControls event={event} />}
      strip={
        <div className="border-t border-[#35302a] bg-[#26231f]">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-4 py-2 sm:px-6">
            <span className="grid h-9 w-14 shrink-0 place-items-center overflow-hidden rounded bg-[#35302a]">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote covers, no loader configured
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="h-3.5 w-3.5 text-[#8b8377]" aria-hidden />
              )}
            </span>
            <p className="min-w-0 flex-1 truncate text-[0.8125rem] text-[#a8a096]">
              {STATE[event.status]}
              {" · "}
              {event.moderation === "manual" ? "review manual" : "review otomatis"}
              {" · "}
              {/* A3: this surface polls, and saying so is what stops an admin refreshing it. */}
              terbarui otomatis
              {!event.acceptingQuestions && " · tertutup"}
              {event.hidden && " · tidak publik"}
            </p>
          </div>
        </div>
      }
    >
      <AdminBoard eventId={event.id} youtubeId={event.youtubeId} />
    </AdminShell>
  );
}
