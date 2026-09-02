import { PenLine } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
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

        <div className="border-b border-border-soft bg-card px-4 py-3 sm:px-6">
          <p className="text-sm text-foreground">
            {event.speaker} · {event.venue}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
            <LocalTime iso={event.startsAt} />
            {event.moderation === "manual" && " · review manual"}
          </p>
        </div>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-3.5 sm:px-6">
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

      {event.acceptingQuestions && (
        <div className="sticky bottom-0 border-t border-border-soft bg-background/90 px-4 pt-3 backdrop-blur sm:px-6 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
          <Link
            href={`/events/${event.id}/tanya`}
            className="mx-auto flex min-h-[3.25rem] w-full max-w-3xl items-center justify-center gap-2 rounded-[14px] bg-primary font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <PenLine className="h-[18px] w-[18px]" aria-hidden />
            Kirim pertanyaan
          </Link>
        </div>
      )}
    </>
  );
}
