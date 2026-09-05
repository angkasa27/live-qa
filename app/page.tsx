import { ArrowRight, CalendarOff, Clock, Lock, MessageCircle, User, Video } from "lucide-react";
import Link from "next/link";

import BottomTabs from "@/components/BottomTabs";
import LocalTime from "@/components/LocalTime";
import { MetaItem, MetaList } from "@/components/MetaList";
import Poster from "@/components/Poster";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { listEvents } from "@/lib/queries";
import { coverFor, type Event } from "@/lib/types";

// Reads the database on every request. The list has to show what's live *now*, and a session
// going live is exactly the moment a stale cache would be worst.
export const dynamic = "force-dynamic";

type Row = Event & { questionCount: number; lead: boolean };

/** A section title. Flat and quiet — it names a group, it is not a thing you tap. */
function Rule({ children }: { children: React.ReactNode }) {
  return <p className="px-5 pt-4 pb-2 text-base font-bold text-muted-foreground">{children}</p>;
}

/**
 * The one majelis this page is about, promoted into the only shape on the screen with a
 * radius and a colour. Everything else is a flat row, so this reads as "here" without a
 * heading having to say so.
 *
 * Title and meta ride on the cover under a veil rather than sitting under it, which keeps
 * the card short enough that the next session is still on screen.
 */
function Hero({ e }: { e: Row }) {
  const cover = coverFor(e);
  const live = e.status === "live";

  return (
    <Link
      href={`/events/${e.id}`}
      className="mx-4 mt-4 block overflow-hidden rounded-lg bg-primary text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="relative">
        {cover ? (
          // next/image would need a domain allowlist for a URL organisers supply.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="aspect-video w-full object-cover" />
        ) : (
          <Poster />
        )}

        {live && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-live px-3.5 py-1.5 text-2xs font-bold">
            <span className="size-2 rounded-full bg-current motion-safe:animate-pulse" aria-hidden />
            Sedang berlangsung
          </span>
        )}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,38,30,0)_26%,rgba(9,38,30,0.58)_60%,rgba(9,38,30,0.95)_100%)]" />

        <div className="absolute inset-x-0 bottom-0 px-4 pb-3.5">
          <h2 className="text-xl leading-snug font-bold tracking-[-0.02em] [text-shadow:0_1px_12px_rgba(9,38,30,0.5)]">
            {e.name}
          </h2>
          <MetaList className="mt-2 gap-1 [&_svg]:stroke-white/70">
            <MetaItem icon={User} className="text-sm">
              {e.speaker}
            </MetaItem>
            <MetaItem icon={Clock} className="text-sm">
              <LocalTime iso={e.startsAt} />
            </MetaItem>
          </MetaList>
        </div>
      </div>

      <span className="flex items-center justify-between gap-3 py-2.5 pr-2.5 pl-4 text-sm">
        <span className="inline-flex items-center gap-2">
          <MessageCircle className="size-4 stroke-2" aria-hidden />
          {e.questionCount} Pertanyaan
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 font-bold text-primary">
          {e.acceptingQuestions ? "Bertanya" : "Lihat majelis"}
          <ArrowRight className="size-3.5 stroke-[2.6]" aria-hidden />
        </span>
      </span>
    </Link>
  );
}

/**
 * A session in a list: flat, full width, the whole row tappable. The tags line under it
 * carries the one fact worth knowing before you open it — whether you can ask, or what is
 * waiting inside.
 */
function EventRow({ e }: { e: Row }) {
  const cover = coverFor(e);
  const upcoming = e.status === "scheduled";

  return (
    <Item render={<Link href={`/events/${e.id}`} />} className="flex-wrap">
      {cover ? (
        <ItemMedia variant="image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" loading="lazy" />
        </ItemMedia>
      ) : (
        upcoming && (
          <ItemMedia variant="image">
            <Poster className="rounded-sm" />
          </ItemMedia>
        )
      )}

      <ItemContent>
        <ItemTitle className="block">{e.name}</ItemTitle>
        <MetaList className="gap-1.5">
          <MetaItem icon={User} className="text-sm">
            {e.speaker}
          </MetaItem>
          <MetaItem icon={Clock} className="text-sm">
            <LocalTime iso={e.startsAt} />
          </MetaItem>
        </MetaList>
      </ItemContent>

      <p className="flex basis-full flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-primary">
        {e.acceptingQuestions ? (
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="size-3.5 stroke-[1.9]" aria-hidden />
            Terbuka untuk pertanyaan
          </span>
        ) : upcoming ? (
          <span className="inline-flex items-center gap-1.5 text-faint">
            <Lock className="size-3.5 stroke-[1.9]" aria-hidden />
            Dibuka saat majelis mulai
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="size-3.5 stroke-[1.9]" aria-hidden />
              {e.questionCount} Pertanyaan
            </span>
            {e.youtubeId && (
              <span className="inline-flex items-center gap-1.5">
                <Video className="size-3.5 stroke-[1.9]" aria-hidden />
                Rekaman
              </span>
            )}
          </>
        )}
      </p>
    </Item>
  );
}

export default async function EventListPage() {
  const events = await listEvents();
  /**
   * The one majelis this page is about, if there is one: whatever is running, else the next
   * session to start. Everything else here is an archive, and a jamaah opening this in the
   * mosque car park is looking for exactly one row. The query sorts it to the front and says
   * whether it qualifies; see lib/queries.ts.
   *
   * ponytail: a session whose start time has passed but which nobody flipped to live leaves
   * the page with no lead at all. Give the scheduled branch a grace window in that query if it
   * turns out to happen in a real majelis.
   */
  const [first, ...rest] = events;
  const lead = first?.lead ? first : null;
  const others = lead ? rest : events;
  const upcoming = others.filter((e) => e.status !== "archived");
  const past = others.filter((e) => e.status === "archived");

  return (
    <>
      <header className="px-5 pt-5 pb-1">
        <h1 className="text-3xl leading-tight font-extrabold tracking-[-0.03em]">Sual</h1>
        <p className="text-base text-muted-foreground">
          Setiap pertanyaan begitu berarti.
        </p>
      </header>

      <main className="page flex-1">
        {events.length === 0 ? (
          <Empty className="m-4 rounded-md border border-border">
            <EmptyMedia variant="icon">
              <CalendarOff aria-hidden />
            </EmptyMedia>
            <EmptyDescription>Belum ada majelis.</EmptyDescription>
          </Empty>
        ) : (
          <>
            {lead && <Hero e={lead} />}

            {upcoming.length > 0 && (
              <>
                <Rule>Akan datang</Rule>
                {upcoming.map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
              </>
            )}

            {past.length > 0 && (
              <>
                <Rule>Sudah lewat</Rule>
                {past.map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
              </>
            )}
          </>
        )}
      </main>

      <BottomTabs current="/" />
    </>
  );
}
