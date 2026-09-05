import { Pencil, Presentation, QrCode } from "lucide-react";
import Link from "next/link";

import AdminBoard from "@/components/AdminBoard";
import { SessionDeck, SessionEndzone } from "@/components/admin/SessionControls";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Toolbar, ToolbarBack, ToolbarTitle } from "@/components/ui/toolbar";
import { requireEventAccess } from "@/lib/guard";
import { eventDate } from "@/lib/relativeTime";

export const dynamic = "force-dynamic";

// Reading a 40-minute recording is a single long Gemini call from a server action on this
// route, and the platform default (60s on Vercel Hobby) is not enough for it.
export const maxDuration = 300;

export default async function AdminEventPage({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  // 404s a majelis this admin is not staffing, exactly as it 404s one that doesn't exist.
  const { event, canEdit } = await requireEventAccess(`/admin/events/${id}`, id);

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
          render={<Link href={`/admin/events/${event.id}/tayangkan`} />}
        >
          <QrCode aria-hidden />
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ubah sesi"
            className="text-on-bar active:bg-white/12"
            render={<Link href={`/admin/events/${event.id}/ubah`} />}
          >
            <Pencil aria-hidden />
          </Button>
        )}
      </Toolbar>

      <SessionDeck event={event} when={eventDate(event.startsAt)} />

      <PageShell padded={false}>
        <AdminBoard eventId={event.id} youtubeId={event.youtubeId} canAnswer={canEdit} />
        <SessionEndzone event={event} />
      </PageShell>
    </>
  );
}
