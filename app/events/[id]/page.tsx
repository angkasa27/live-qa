import { Clock, MapPin, MessageCircle, PenLine, User, Video } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import Countdown from "@/components/Countdown";
import LocalTime from "@/components/LocalTime";
import { MetaItem, MetaList } from "@/components/MetaList";
import Player from "@/components/Player";
import Poster from "@/components/Poster";
import QuestionList from "@/components/QuestionList";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toolbar, ToolbarBack, ToolbarSpacer } from "@/components/ui/toolbar";
import { countQuestions, getEvent } from "@/lib/queries";
import { coverFor } from "@/lib/types";

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

  const total = await countQuestions(event.id);
  const cover = !event.youtubeId ? coverFor(event) : undefined;
  const live = event.status === "live";
  const archived = event.status === "archived";
  const scheduled = event.status === "scheduled";

  return (
    <>
      <Toolbar>
        <ToolbarBack href="/">Majelis</ToolbarBack>
        <ToolbarSpacer />
        {live && (
          <Badge variant="live">
            <span className="size-2 rounded-full bg-current motion-safe:animate-pulse" aria-hidden />
            Berlangsung
          </Badge>
        )}
        {archived && event.youtubeId && (
          <Badge variant="accent">
            <Video aria-hidden />
            Rekaman
          </Badge>
        )}
      </Toolbar>

      {/* With a recording on the page, <Player> owns the iframe and lets the answer timestamps
          seek it in place instead of sending anyone off to YouTube. */}
      <MaybePlayer youtubeId={event.youtubeId} title={`Rekaman: ${event.name}`}>
        {!event.youtubeId &&
          (cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote host, see app/page.tsx
            <img src={cover} alt="" className="page aspect-video w-full object-cover" />
          ) : (
            <Poster className="page" />
          ))}

        <div className="page border-b border-border-soft px-5 pt-5 pb-4.5">
          <h1 className="text-2xl leading-snug font-bold tracking-[-0.025em]">{event.name}</h1>
          <MetaList className="mt-3.5">
            <MetaItem icon={User}>{event.speaker}</MetaItem>
            <MetaItem icon={MapPin}>{event.venue}</MetaItem>
            <MetaItem icon={Clock}>
              <LocalTime iso={event.startsAt} />
            </MetaItem>
          </MetaList>
        </div>

        <main className="page flex-1">
          {/* A session that has not started has nothing to read yet, so the page is the wait. */}
          {scheduled && !event.acceptingQuestions ? (
            <Countdown iso={event.startsAt} />
          ) : (
            <>
              {event.acceptingQuestions && (
                <Alert variant="info" className="mx-5 mt-4">
                  <MessageCircle aria-hidden />
                  <AlertDescription>
                    {event.moderation === "manual"
                      ? "Pertanyaan Anda masuk ke admin dulu, lalu tampil di layar pemateri."
                      : "Pertanyaan Anda langsung masuk ke layar pemateri."}
                  </AlertDescription>
                </Alert>
              )}

              {/* Whether questions are open is the event's own answer, not a guess from its
                  status: an admin can keep an archived session taking questions. ROADMAP §2. */}
              {archived && !event.acceptingQuestions && (
                <Alert className="mx-5 mt-4">
                  <Video aria-hidden />
                  <AlertDescription>
                    Jawaban tertulis adalah <strong className="font-semibold text-foreground">ringkasan admin</strong>.
                    Rekaman tetap rujukan utama.
                  </AlertDescription>
                </Alert>
              )}

              <QuestionList
                eventId={event.id}
                speaker={event.speaker}
                youtubeId={event.youtubeId}
                total={total}
                canAsk={event.acceptingQuestions}
                note={
                  archived && event.youtubeId
                    ? "Ketuk menit untuk memutar rekaman di bagian itu."
                    : undefined
                }
              />
            </>
          )}
        </main>
      </MaybePlayer>

      {event.acceptingQuestions && (
        <div className="sticky bottom-0 border-t border-border-soft bg-card/95 backdrop-blur-md">
          <div className="page px-5 py-3 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
            <Button size="lg" render={<Link href={`/events/${event.id}/ask`} />}>
              <PenLine aria-hidden />
              Kirim pertanyaan
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
