"use client";

import { useEffect, useState } from "react";

/** Whole days/hours/minutes left, or null once the moment has passed. */
function remaining(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.floor(ms / 60_000);
  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
  };
}

/**
 * How long until questions open on a session that has not started.
 *
 * Client-only on purpose: a countdown rendered on the server is stale before it is painted,
 * and hydration would have to reconcile two different numbers. It renders nothing at all on
 * the first pass, then ticks once a minute — seconds would be a distraction on something
 * usually days away, and a per-second timer on a page left open in a pocket is rude.
 */
export default function Countdown({ iso }: { iso: string }) {
  const [left, setLeft] = useState<ReturnType<typeof remaining>>(null);

  useEffect(() => {
    const tick = () => setLeft(remaining(iso));
    tick();
    const id = setInterval(tick, 60_000);
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
        ].map(([value, unit]) => (
          <div key={unit} className="basis-22 rounded-md bg-background py-3">
            <b className="block text-2xl leading-tight font-extrabold tracking-[-0.03em] tabular-nums">
              {value}
            </b>
            <span className="mt-0.5 block text-2xs text-muted-foreground">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
