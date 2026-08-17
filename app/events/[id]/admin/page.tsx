import { notFound } from "next/navigation";
import AdminBoard from "@/components/AdminBoard";
import EventHeader from "@/components/EventHeader";
import { events } from "@/lib/mock";

// TODO(auth): this route and /speaker are the two that get the auth middleware.
export default async function AdminPage({ params }: PageProps<"/events/[id]/admin">) {
  const { id } = await params;
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  return (
    <>
      <EventHeader name={event.name} backHref={`/events/${event.id}`} backLabel="Back to the event" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-5 sm:px-6">
        <h2 className="mb-4 text-xl font-semibold sm:text-2xl">Answers</h2>
        <AdminBoard eventId={event.id} />
      </main>
    </>
  );
}
