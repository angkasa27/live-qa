import Link from "next/link";
import { notFound } from "next/navigation";
import AdminBoard from "@/components/AdminBoard";
import EventControls from "@/components/EventControls";
import EventHeader from "@/components/EventHeader";
import { getEvent } from "@/lib/queries";
import { requireSession } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AdminEventPage({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  await requireSession(`/admin/events/${id}`);

  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <>
      <EventHeader
        name={event.name}
        backHref="/admin"
        backLabel="Semua majelis"
        action={
          <Link
            href={`/admin/events/${event.id}/speaker`}
            className="flex min-h-[2.75rem] shrink-0 items-center rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Layar pemateri
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-5 sm:px-6">
        <EventControls event={event} />
        <h2 className="mb-4 mt-6 text-xl font-semibold sm:text-2xl">Pertanyaan</h2>
        <AdminBoard eventId={event.id} />
      </main>
    </>
  );
}
