import { notFound } from "next/navigation";
import AskDrawer from "@/components/AskDrawer";
import EventHeader from "@/components/EventHeader";
import StatusBadge from "@/components/StatusBadge";
import Player from "@/components/Player";
import QuestionList from "@/components/QuestionList";
import { getEvent } from "@/lib/queries";
import { coverFor } from "@/lib/types";
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

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const cover = !event.youtubeId ? coverFor(event) : undefined;

  return (
    <>
      <EventHeader
        name={event.name}
        backHref="/"
        backLabel="Semua majelis"
        action={<StatusBadge status={event.status} />}
      />

      {/* With a recording on the page, <Player> owns the iframe and lets the answer timestamps
          seek it in place instead of sending anyone off to YouTube. */}
      <MaybePlayer youtubeId={event.youtubeId} title={`Rekaman: ${event.name}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- remote host, see app/page.tsx
          <img src={cover} alt="" className="aspect-video w-full bg-border object-cover" />
        )}

        <div className="border-b border-border-soft bg-card">
          <div className="page px-4 py-3 sm:px-6">
            <p className="text-sm text-foreground">
              {event.speaker} · {event.venue}
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
              <LocalTime iso={event.startsAt} />
              {event.moderation === "manual" && " · review manual"}
            </p>
          </div>
        </div>

        <main className="page flex-1 px-4 py-3.5 sm:px-6">
          {/* Whether questions are open is the event's own answer, not a guess from its status:
              an admin can keep an archived session taking questions. See ROADMAP.md §2. */}
          {!event.acceptingQuestions && event.status === "archived" && (
            <p className="mb-3.5 rounded-[14px] border border-border bg-background px-3.5 py-3 text-[0.8125rem] leading-relaxed text-muted-foreground text-pretty">
              Jawaban tertulis di bawah adalah ringkasan admin. Rekaman majelis adalah rujukan
              utama.
            </p>
          )}
          <QuestionList
            eventId={event.id}
            youtubeId={event.youtubeId}
            canAsk={event.acceptingQuestions}
          />
        </main>
      </MaybePlayer>

      {/* A sheet over the majelis rather than a route: asking should not navigate away from
          the thing being asked about, and the old page 404'd for any session that had since
          stopped taking questions. */}
      {event.acceptingQuestions && (
        <AskDrawer eventId={event.id} moderated={event.moderation === "manual"} />
      )}
    </>
  );
}
