import Link from "next/link";
import { notFound } from "next/navigation";
import AdminBoard from "@/components/AdminBoard";
import AdminShell from "@/components/admin/Shell";
import EventControls from "@/components/EventControls";
import LocalTime from "@/components/LocalTime";
import { getEvent } from "@/lib/queries";
import { requireSession } from "@/lib/guard";

export const dynamic = "force-dynamic";

// Reading a 40-minute recording is a single long Gemini call from a server action on this
// route, and the platform default (60s on Vercel Hobby) is not enough for it.
export const maxDuration = 300;

export default async function AdminEventPage({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  await requireSession(`/admin/events/${id}`);

  const event = await getEvent(id, { includeHidden: true });
  if (!event) notFound();

  return (
    <AdminShell
      wide
      back={{ href: "/admin", label: "Semua majelis" }}
      title={event.name}
      subtitle={
        <>
          {event.speaker} · <LocalTime iso={event.startsAt} /> · {event.venue}
        </>
      }
      action={
        <Link
          href={`/admin/events/${event.id}/speaker`}
          className="flex min-h-[3rem] w-full items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
        >
          Layar pemateri
        </Link>
      }
    >
      {/* Text links, not buttons: three full-width blocks stacked on a phone would push the
          questions below the fold, and only "Layar pemateri" is touched mid-session. */}
      <nav className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <Link
          href={`/admin/events/${event.id}/edit`}
          className="underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Ubah detail
        </Link>
        <a
          href={`/events/${event.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Lihat halaman jamaah
        </a>
      </nav>

      <EventControls event={event} />
      <h2 className="mb-3 mt-6 text-lg font-semibold">Pertanyaan</h2>
      <AdminBoard eventId={event.id} youtubeId={event.youtubeId} />
    </AdminShell>
  );
}
