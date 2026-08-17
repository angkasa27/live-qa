import Link from "next/link";
import { notFound } from "next/navigation";
import EventHeader from "@/components/EventHeader";
import ModeBadge from "@/components/ModeBadge";
import Player from "@/components/Player";
import QuestionList from "@/components/QuestionList";
import SubmitForm from "@/components/SubmitForm";
import { events } from "@/lib/mock";
import { eventDate } from "@/lib/relativeTime";

/** No recording → no player, and the children render exactly as they would have. */
function MaybePlayer({
  youtubeId,
  title,
  children,
}: {
  youtubeId?: string;
  title: string;
  children: React.ReactNode;
}) {
  if (!youtubeId) return <>{children}</>;
  return (
    <Player youtubeId={youtubeId} title={title}>
      {children}
    </Player>
  );
}

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  return (
    <>
      <EventHeader name={event.name} backHref="/" backLabel="All sessions" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-4 pt-6 sm:px-6">
        {!event.youtubeId && event.image && (
          // eslint-disable-next-line @next/next/no-img-element -- remote host, see app/page.tsx
          <img
            src={event.image}
            alt=""
            className="mb-5 aspect-video w-full rounded-xl bg-border object-cover"
          />
        )}

        {/* With a recording on the page, <Player> owns the iframe and lets the answer
            timestamps seek it in place instead of sending anyone off to YouTube. */}
        <MaybePlayer youtubeId={event.youtubeId} title={`Recording: ${event.name}`}>
          <div className="mb-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{event.name}</h2>
              <ModeBadge mode={event.mode} />
            </div>
            <p className="mt-1.5 text-sm text-muted">
              {event.speaker} · {eventDate(event.startsAt)} · {event.venue}
            </p>
          </div>

          {/* Only a live event takes questions. A recorded one is an archive — it opens straight
              onto what was already asked and answered. */}
          {event.mode === "live" ? (
            <SubmitForm eventId={event.id} />
          ) : (
            <>
              <h3 className="mb-3 text-lg font-semibold">Questions from this session</h3>
              <QuestionList eventId={event.id} youtubeId={event.youtubeId} />
            </>
          )}
        </MaybePlayer>

        <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          {event.mode === "live" && (
            <Link href={`/events/${event.id}/questions`} className="underline underline-offset-4 hover:text-foreground">
              All questions
            </Link>
          )}
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
