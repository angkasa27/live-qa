"use client";

import { eventDate } from "@/lib/relativeTime";

/** Server renders UTC (its own zone); the client re-renders in the visitor's zone. */
export default function LocalTime({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {eventDate(iso)}
    </time>
  );
}
