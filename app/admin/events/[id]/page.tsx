import { ExternalLink, ImageOff, Presentation } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminBoard from "@/components/AdminBoard";
import AdminShell from "@/components/admin/Shell";
import SessionSettings from "@/components/SessionSettings";
import { countQuestions, getEvent } from "@/lib/queries";
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
      /* Two icons, and they are two different kinds of thing. The speaker screen is a place
         to go — A7 wants it opened from the session the admin is already running — and the
         sliders open the one place the session is configured. Neither is inside the other. */
      action={
        <div className="flex items-center">
          <Link
            href={`/admin/events/${event.id}/speaker`}
            aria-label="Layar pemateri"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[#e8e5df] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8e5df]"
          >
            <Presentation className="h-5 w-5" aria-hidden />
          </Link>
          <SessionSettings event={event} questionCount={await countQuestions(id)} />
        </div>
      }
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
            {/* The strip describes the session; this opens what a jamaah sees of it. */}
            <a
              href={`/events/${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Lihat halaman jamaah"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#8b8377] transition-colors hover:text-[#f2efe8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8e5df]"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      }
    >
      <AdminBoard eventId={event.id} youtubeId={event.youtubeId} />
    </AdminShell>
  );
}
