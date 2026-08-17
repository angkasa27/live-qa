"use client";

import Link from "next/link";
import ModeBadge from "@/components/ModeBadge";
import { coverFor, events } from "@/lib/mock";
import { eventDate } from "@/lib/relativeTime";
import { useQa } from "@/lib/store";

export default function EventListPage() {
  const { all } = useQa();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Live sessions</h1>
        <p className="mt-1.5 text-[0.9375rem] text-muted">
          Pick a session to send the speaker a question.
        </p>
      </header>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted">
          No sessions are live right now.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {events.map((e) => {
            const count = all.filter((q) => q.eventId === e.id).length;
            const cover = coverFor(e);
            return (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  className="flex h-full min-h-[3.5rem] flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {cover && (
                    /* next/image would need a domain allowlist for a URL users supply. */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      loading="lazy"
                      className="aspect-video w-full bg-border object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold leading-snug">{e.name}</h2>
                      <ModeBadge mode={e.mode} />
                    </div>
                    <p className="mt-2 text-sm text-muted">{eventDate(e.startsAt)}</p>
                    <p className="text-sm text-muted">{e.venue}</p>
                    <p className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted">{e.speaker}</span>
                      <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                        {count} {count === 1 ? "question" : "questions"}
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
