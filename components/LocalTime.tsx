import { eventDate } from "@/lib/relativeTime";

/** Session times are pinned to the majelis' zone, so server and client agree. */
export default function LocalTime({ iso }: { iso: string }) {
  return <time dateTime={iso}>{eventDate(iso)}</time>;
}
