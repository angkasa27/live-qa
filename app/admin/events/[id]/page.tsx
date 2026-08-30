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

  const event = await getEvent(id);
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
          className="flex min-h-[3rem] w-full items-center justify-center rounded-xl bg-accent px-5 font-semibold text-accent-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
        >
          Layar pemateri
        </Link>
      }
    >
      <EventControls event={event} />
      <h2 className="mb-3 mt-6 text-lg font-semibold">Pertanyaan</h2>
      <AdminBoard eventId={event.id} youtubeId={event.youtubeId} />
    </AdminShell>
  );
}
