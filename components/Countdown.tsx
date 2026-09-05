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
 * How long until questions open on a session that has not started.
 *
 * Client-only on purpose: a countdown rendered on the server is stale before it is painted,
 * and hydration would have to reconcile two different numbers. It renders nothing at all on
 * the first pass, then ticks every second — the last minute before a majelis starts is the
 * one anyone is actually watching, and a clock that sits still through it reads as broken.
 */
export default function Countdown({ iso }: { iso: string }) {
  const [left, setLeft] = useState<ReturnType<typeof remaining>>(null);

  useEffect(() => {
    const tick = () => setLeft(remaining(iso));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);

  if (!left) return null;

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
            <b className="block text-2xl font-extrabold tracking-[-0.03em] tabular-nums">
              {value}
            </b>
            <span className="mt-0.5 block text-2xs text-muted-foreground">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
