import { ArrowRight, CalendarOff } from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import BottomTabs from "@/components/BottomTabs";
import { listEvents } from "@/lib/queries";
import { coverFor } from "@/lib/types";
import LocalTime from "@/components/LocalTime";

// Reads the database on every request. The list has to show what's live *now*, and a session
// going live is exactly the moment a stale cache would be worst.
export const dynamic = "force-dynamic";

export default async function EventListPage() {
  const events = await listEvents();

  return (
    <>
      <header className="border-b border-border-soft bg-card">
        <div className="page px-4 pt-[18px] pb-3.5 sm:px-6">
          <h1 className="font-serif text-[1.625rem] leading-tight font-medium tracking-tight">Majelis</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Pilih majelis untuk bertanya atau membaca jawaban.</p>
        </div>
      </header>

      <main className="page flex-1 px-4 py-4 sm:px-6">
        {events.length === 0 ? (
          <Empty className="rounded-2xl">
            <EmptyMedia variant="icon">
              <CalendarOff aria-hidden />
            </EmptyMedia>
            <EmptyDescription>Belum ada majelis.</EmptyDescription>
          </Empty>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {events.map((e) => {
              const cover = coverFor(e);
              const live = e.status === "live";
              return (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.id}`}
                    className={`flex h-full flex-col overflow-hidden rounded-2xl bg-card transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      live ? "border-[1.5px] border-primary" : "border border-border"
                    }`}
                  >
                    {cover && (
                      <div className="relative">
                        {/* next/image would need a domain allowlist for a URL organisers supply. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cover}
                          alt=""
                          loading="lazy"
                          className="aspect-video w-full bg-border object-cover"
                        />
                        {live && (
                          <span className="absolute right-2.5 bottom-2.5">
                            <StatusBadge status="live" />
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                      <div className="flex items-start justify-between gap-2.5">
                        <h2 className="leading-snug font-bold">{e.name}</h2>
                        {/* Already shown over the cover on a live card; don't say it twice. */}
                        {!(live && cover) && <StatusBadge status={e.status} />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {e.speaker} · {e.venue}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <LocalTime iso={e.startsAt} />
                      </p>
                      <p className="mt-1.5 flex items-center justify-between gap-3 text-[0.8125rem] font-semibold">
                        <span className="text-primary">{e.questionCount} pertanyaan</span>
                        {e.acceptingQuestions ? (
                          <span className="flex items-center gap-1 text-primary">
                            Bertanya
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        ) : (
                          <span className="font-normal text-faint">
                            {e.status === "scheduled"
                              ? "Pertanyaan dibuka saat majelis berlangsung."
                              : e.youtubeId
                                ? "· ada rekaman"
                                : ""}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <BottomTabs current="/" />
    </>
  );
}
