"use client";

import Link from "next/link";
import { events } from "@/lib/mock";
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
            return (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  className="flex h-full min-h-[3.5rem] flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <h2 className="text-lg font-semibold leading-snug">{e.name}</h2>
                  <p className="mt-2 text-sm text-muted">{eventDate(e.startsAt)}</p>
                  <p className="text-sm text-muted">{e.venue}</p>
                  <p className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">{e.speaker}</span>
                    <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                      {count} {count === 1 ? "question" : "questions"}
                    </span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
