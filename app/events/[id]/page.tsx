import Link from "next/link";
import { notFound } from "next/navigation";
import EventHeader from "@/components/EventHeader";
import SubmitForm from "@/components/SubmitForm";
import { events } from "@/lib/mock";
import { eventDate } from "@/lib/relativeTime";

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  return (
    <>
      <EventHeader name={event.name} backHref="/" backLabel="All sessions" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-4 pt-6 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{event.name}</h2>
          <p className="mt-1.5 text-sm text-muted">
            {event.speaker} · {eventDate(event.startsAt)} · {event.venue}
          </p>
        </div>

        <SubmitForm eventId={event.id} />

        <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <Link href={`/events/${event.id}/questions`} className="underline underline-offset-4 hover:text-foreground">
            All questions
          </Link>
          <Link href={`/events/${event.id}/speaker`} className="underline underline-offset-4 hover:text-foreground">
            Speaker view
          </Link>
          <Link href={`/events/${event.id}/admin`} className="underline underline-offset-4 hover:text-foreground">
            Admin
          </Link>
        </nav>
      </main>
    </>
  );
}
