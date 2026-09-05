import { Clock, MapPin, Pencil, Presentation, QrCode, User } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import AdminBoard from "@/components/AdminBoard";
import { SessionActions } from "@/components/admin/SessionControls";
import LocalTime from "@/components/LocalTime";
import { MetaItem, MetaList } from "@/components/MetaList";
import PageShell from "@/components/PageShell";
import Player from "@/components/Player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toolbar, ToolbarBack, ToolbarTitle } from "@/components/ui/toolbar";
import { requireEventAccess } from "@/lib/guard";
import { coverFor } from "@/lib/types";

export const dynamic = "force-dynamic";

// Reading a 40-minute recording is a single long Gemini call from a server action on this
// route, and the platform default (60s on Vercel Hobby) is not enough for it.
export const maxDuration = 300;

/** No recording → no player, and the children render exactly as they would have. */
function MaybePlayer({
  youtubeId,
  title,
  children,
}: {
  youtubeId: string | null | undefined;
  title: string;
  children: ReactNode;
}) {
  if (!youtubeId) return <>{children}</>;
  return (
    <Player youtubeId={youtubeId} title={title}>
      {children}
    </Player>
  );
}

export default async function AdminEventPage({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  // 404s a majelis this admin is not staffing, exactly as it 404s one that doesn't exist.
  const { event, canEdit } = await requireEventAccess(`/admin/events/${id}`, id);
  const cover = !event.youtubeId ? coverFor(event) : undefined;

  return (
    <>
      {/*
       * Three things a session is, from the bar: put it on the projector, hand it to the
       * room, or change what it is. The speaker screen has its own icon because it is the
       * one an operator opens mid-majelis, and burying it one tap inside the QR screen put
       * a nightly action behind a once-a-session one.
       */}
      <Toolbar variant="ink">
        <ToolbarBack href="/admin">{""}</ToolbarBack>
        <ToolbarTitle>{event.name}</ToolbarTitle>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Layar pemateri"
          className="text-on-bar active:bg-white/12"
          render={<Link href={`/admin/events/${event.id}/speaker`} />}
        >
          <Presentation aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Bagikan majelis"
          className="text-on-bar active:bg-white/12"
          render={<Link href={`/admin/events/${event.id}/share`} />}
        >
          <QrCode aria-hidden />
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ubah sesi"
            className="text-on-bar active:bg-white/12"
            render={<Link href={`/admin/events/${event.id}/edit`} />}
          >
            <Pencil aria-hidden />
          </Button>
        )}
      </Toolbar>

      {/*
       * The admin page now opens on the majelis rather than on its controls: the recording
       * or the cover, then what the session is, then the queue. An operator arriving
       * mid-evening can see they opened the right one — two sessions in a week share a
       * speaker and a venue and differ only by their cover — and the answer timestamps get
       * a player to seek, which on this side they never had.
       *
       * No <Poster> fallback here, unlike the public page. Most majelis are announced without
       * artwork, so the placeholder was the common case rather than the exception: a quarter
       * of the screen of green, every night, saying nothing an operator did not already know
       * from the title above it. With nothing to show, the session's details start the page.
       */}
      <MaybePlayer youtubeId={event.youtubeId} title={`Rekaman: ${event.name}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- remote host, see app/page.tsx
          <img src={cover} alt="" className="page aspect-video w-full object-cover" />
        )}

        <div className="page border-b border-border-soft px-5 pt-5 pb-4.5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold">{event.name}</h1>
            {event.status === "live" && (
              <Badge variant="live" className="mt-1 shrink-0">
                <span className="size-2 rounded-full bg-current motion-safe:animate-pulse" aria-hidden />
                Berlangsung
              </Badge>
            )}
          </div>
          <MetaList className="mt-3.5">
            <MetaItem icon={User}>{event.speaker}</MetaItem>
            <MetaItem icon={MapPin}>{event.venue}</MetaItem>
            <MetaItem icon={Clock}>
              <LocalTime iso={event.startsAt} />
            </MetaItem>
          </MetaList>
        </div>

        <PageShell padded={false} action={<SessionActions event={event} canEdit={canEdit} />}>
          <AdminBoard eventId={event.id} youtubeId={event.youtubeId} canAnswer={canEdit} />
        </PageShell>
      </MaybePlayer>
    </>
  );
}
