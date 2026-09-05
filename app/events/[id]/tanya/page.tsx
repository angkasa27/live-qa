import { notFound, redirect } from "next/navigation";

import AskForm from "@/components/AskForm";
import { Toolbar, ToolbarBack } from "@/components/ui/toolbar";
import { getEvent } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Asking is a screen of its own again, but not the one this used to be.
 *
 * The old route 404'd the moment a session stopped taking questions, so a stale tab or a
 * back button landed on a dead end — which is why this became a sheet for a while. It is a
 * route again because the design gives asking a full screen (a real textarea, no gesture
 * fighting the keyboard), and the dead end is fixed by redirecting to the majelis instead
 * of pretending it does not exist. Only a session that genuinely is not there 404s.
 */
export default async function AskPage({ params }: PageProps<"/events/[id]/tanya">) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  if (!event.acceptingQuestions) redirect(`/events/${event.id}`);

  return (
    <>
      <Toolbar>
        <ToolbarBack href={`/events/${event.id}`}>Batal</ToolbarBack>
      </Toolbar>
      <AskForm
        eventId={event.id}
        eventName={event.name}
        moderated={event.moderation === "manual"}
      />
    </>
  );
}
