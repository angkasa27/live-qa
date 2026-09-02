import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
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
      <header className="border-b border-border-soft bg-surface px-4 pt-[18px] pb-3.5 sm:px-6">
        <h1 className="font-serif text-[1.625rem] leading-tight font-medium tracking-tight">Majelis</h1>
        <p className="mt-1.5 text-sm text-muted">Pilih majelis untuk bertanya atau membaca jawaban.</p>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 sm:px-6">
        {events.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-muted">
            Belum ada majelis.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {events.map((e) => {
              const cover = coverFor(e);
              const live = e.status === "live";
              return (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.id}`}
                    className={`flex h-full flex-col overflow-hidden rounded-2xl bg-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      live ? "border-[1.5px] border-accent" : "border border-border"
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
                      <p className="text-sm text-muted">
                        {e.speaker} · {e.venue}
                      </p>
                      <p className="text-sm text-muted">
                        <LocalTime iso={e.startsAt} />
                      </p>
                      <p className="mt-1.5 flex items-center justify-between gap-3 text-[0.8125rem] font-semibold">
                        <span className="text-accent">{e.questionCount} pertanyaan</span>
                        {e.acceptingQuestions ? (
                          <span className="text-accent">Bertanya →</span>
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
