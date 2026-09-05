"use client";

import { useEffect, useState } from "react";

/** Whole days/hours/minutes/seconds left, or null once the moment has passed. */
function remaining(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const seconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

/**
 * How long until questions open on a session that has not started, and what to say once
 * that moment arrives and nobody has pressed start.
 *
 * Client-only on purpose: a countdown rendered on the server is stale before it is painted,
 * and hydration would have to reconcile two different numbers. It renders nothing at all on
 * the first pass, then ticks every second — the last minute before a majelis starts is the
 * one anyone is actually watching, and a clock that sits still through it reads as broken.
 *
 * Past the moment it used to return null, which left the page with an empty middle: a majelis
 * only goes live when an operator presses start, so a session running late had nothing on it
 * at all, at exactly the time the room was looking. It now says so instead. That the wait and
 * its ending live in the same component is the point — this ticks, so the page changes over in
 * front of the reader rather than waiting for a refresh nobody performs.
 */
export default function Countdown({ iso }: { iso: string }) {
  // Three states, not two: `undefined` is "not measured yet" (the server pass and the first
  // render), `null` is "measured, and the moment is behind us". Collapsing them would flash
  // the note onto every scheduled majelis before the first tick corrected it.
  const [left, setLeft] = useState<ReturnType<typeof remaining> | undefined>(undefined);

  useEffect(() => {
    const tick = () => setLeft(remaining(iso));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);

  if (left === undefined) return null;

  if (left === null) {
    return (
      <div className="mx-5 my-4 rounded-md border border-border-soft px-4 py-4.5 text-center">
        <h3 className="text-md font-semibold text-muted-foreground">Akan segera dimulai</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Pertanyaan dibuka begitu majelis berlangsung.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-5 my-4 rounded-md border border-border-soft px-4 pt-4.5 pb-5 text-center">
      <h3 className="text-md font-semibold text-muted-foreground">
        Pertanyaan dibuka saat majelis mulai
      </h3>
      <div className="mt-3.5 flex justify-center gap-2.5">
        {[
          [left.days, "hari"],
          [left.hours, "jam"],
          [left.minutes, "menit"],
          [left.seconds, "detik"],
        ].map(([value, unit]) => (
          <div key={unit} className="min-w-0 flex-1 rounded-md bg-background py-3">
            <b className="block text-2xl font-extrabold tabular-nums">
              {value}
            </b>
            <span className="mt-0.5 block text-2xs text-muted-foreground">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
