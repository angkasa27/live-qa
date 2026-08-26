import Link from "next/link";
import { notFound } from "next/navigation";
import EventHeader from "@/components/EventHeader";
import StatusBadge from "@/components/StatusBadge";
import Player from "@/components/Player";
import QuestionList from "@/components/QuestionList";
import SubmitForm from "@/components/SubmitForm";
import { getEvent } from "@/lib/queries";
import LocalTime from "@/components/LocalTime";

export const dynamic = "force-dynamic";

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

export async function generateMetadata({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const event = await getEvent(id);
  // An archived session is link-only until someone decides otherwise; ROADMAP.md §8. A
  // searchable index of a named scholar's answers is a bigger commitment than a share link.
  return event?.status === "archived" ? { robots: { index: false, follow: false } } : {};
}

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <>
      <EventHeader name={event.name} backHref="/" backLabel="Semua majelis" />
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
        <MaybePlayer youtubeId={event.youtubeId} title={`Rekaman: ${event.name}`}>
          <div className="mb-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{event.name}</h2>
              <StatusBadge status={event.status} />
            </div>
            <p className="mt-1.5 text-sm text-muted">
              {event.speaker} · <LocalTime iso={event.startsAt} /> · {event.venue}
            </p>
          </div>

          {/* Whether questions are open is the event's own answer, not a guess from its status:
              an admin can keep an archived session taking questions. See ROADMAP.md §2. */}
          {event.acceptingQuestions ? (
            <SubmitForm eventId={event.id} moderated={event.moderation === "manual"} />
          ) : (
            <>
              {event.status === "archived" && (
                <p className="mb-4 rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-muted">
                  Sesi ini sudah selesai dan tidak lagi menerima pertanyaan. Jawaban di bawah
                  adalah ringkasan yang ditulis admin, rekamannya adalah rujukan yang sebenarnya.
                </p>
              )}
              <h3 className="mb-3 text-lg font-semibold">Pertanyaan sesi ini</h3>
              <QuestionList eventId={event.id} youtubeId={event.youtubeId} />
            </>
          )}
        </MaybePlayer>

        <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          {event.acceptingQuestions && (
            <Link href={`/events/${event.id}/questions`} className="underline underline-offset-4 hover:text-foreground">
              Semua pertanyaan
            </Link>
          )}
          <Link href="/pertanyaan-saya" className="underline underline-offset-4 hover:text-foreground">
            Pertanyaan saya
          </Link>
        </nav>
      </main>
    </>
  );
}
