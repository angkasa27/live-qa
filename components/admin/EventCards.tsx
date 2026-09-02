import { CalendarOff, ImageOff, Play, Presentation } from "lucide-react";
import Link from "next/link";
import LocalTime from "@/components/LocalTime";
import { Badge } from "@/components/ui/badge";
import { coverFor } from "@/lib/types";
import type { listEventsForAdmin } from "@/lib/queries";

type Row = Awaited<ReturnType<typeof listEventsForAdmin>>[number];

/** "07.30 · Masjid Al-Ikhlas · review manual" — the line under every title. */
function Meta({ e, withVenue = true }: { e: Row; withVenue?: boolean }) {
  return (
    <p className="mt-1 truncate text-[0.8125rem] text-muted-foreground">
      <LocalTime iso={e.startsAt} />
      {withVenue && <> · {e.venue}</>}
      {e.moderation === "manual" && <> · review manual</>}
      {e.youtubeId && <> · ada rekaman</>}
    </p>
  );
}

/**
 * The running majelis. It is the only card that earns a cover, a count and its own
 * buttons, because during a session it is the only row anyone opens — REQUIREMENTS.md A1
 * puts the review count as the number demanding action, so it leads and it is warn-toned
 * whenever it is not zero.
 */
export function LiveEventCard({ e }: { e: Row }) {
  const cover = coverFor(e);
  return (
    <article className="overflow-hidden rounded-2xl border-[1.5px] border-live bg-card">
      <div className="relative aspect-video w-full bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote covers, no loader configured
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-faint">
            <ImageOff className="h-7 w-7" aria-hidden />
          </div>
        )}
        <Badge variant="live" className="absolute top-3 right-3 gap-1.5 px-2.5 text-[0.6875rem]">
          <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
          Live
        </Badge>
      </div>

      <div className="p-4">
        <h3 className="text-[1.1875rem] leading-snug font-semibold">{e.name}</h3>
        <Meta e={e} />

        {/* Two numbers, and only two: what needs a decision, and what needs writing. */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <Stat n={e.pending} label="butuh review" tone={e.pending > 0 ? "warn" : "plain"} />
          <Stat n={e.unanswered} label="belum dijawab" tone="plain" />
        </div>

        <div className="mt-3 flex gap-2.5">
          <Link
            href={`/admin/events/${e.id}`}
            className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Buka antrean
          </Link>
          <Link
            href={`/admin/events/${e.id}/speaker`}
            className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 font-semibold transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Presentation className="h-[18px] w-[18px]" aria-hidden />
            Layar pemateri
          </Link>
        </div>
      </div>
    </article>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: "warn" | "plain" }) {
  const warn = tone === "warn";
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        warn ? "border-warn-border bg-warn-soft" : "border-border bg-background"
      }`}
    >
      <p className={`text-[1.375rem] leading-none font-bold tabular-nums ${warn ? "text-warn" : ""}`}>
        {n}
      </p>
      <p className={`mt-1 text-xs ${warn ? "text-warn" : "text-muted-foreground"}`}>{label}</p>
    </div>
  );
}

/**
 * Everything not running: a thumbnail, the name, and only the counts that are non-zero.
 * A hidden majelis is dimmed and says so — it is the one state an admin can forget they
 * left on, and it is why a jamaah's link would 404.
 */
export function EventRowCard({ e }: { e: Row }) {
  const cover = coverFor(e);
  return (
    <Link
      href={`/admin/events/${e.id}`}
      className={`flex gap-3 rounded-xl border p-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        e.hidden ? "border-border bg-muted" : "border-border bg-card hover:border-primary"
      }`}
    >
      <div
        className={`relative grid h-[4.5rem] w-[6.25rem] shrink-0 place-items-center overflow-hidden rounded-lg bg-muted ${
          e.hidden ? "opacity-60" : ""
        }`}
      >
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- remote covers, no loader configured */}
            <img src={cover} alt="" className="h-full w-full object-cover" />
            {e.youtubeId && (
              <span className="absolute grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white">
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
              </span>
            )}
          </>
        ) : (
          <CalendarOff className="h-5 w-5 text-faint" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <h3 className={`truncate font-semibold ${e.hidden ? "text-muted-foreground" : ""}`}>
          {e.name}
        </h3>
        <Meta e={e} withVenue={false} />
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {e.hidden && (
            <Badge variant="outline" className="text-[0.625rem]">
              Tidak publik
            </Badge>
          )}
          {e.pending > 0 && (
            <Badge variant="warn" className="text-[0.625rem] normal-case tracking-normal">
              {e.pending} butuh review
            </Badge>
          )}
          {e.unanswered > 0 && (
            <Badge variant="accent" className="text-[0.625rem]">
              {e.unanswered} belum dijawab
            </Badge>
          )}
          {e.status === "scheduled" && !e.acceptingQuestions && (
            <span className="text-xs text-faint">Tertutup untuk pertanyaan</span>
          )}
        </div>
      </div>
    </Link>
  );
}
