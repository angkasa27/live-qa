import { notFound } from "next/navigation";
import SpeakerDeck from "@/components/SpeakerDeck";
import { events } from "@/lib/mock";

// TODO(auth): this route and /admin are the two that get the auth middleware.
export default async function SpeakerPage({ params }: PageProps<"/events/[id]/speaker">) {
  const { id } = await params;
  if (!events.some((e) => e.id === id)) notFound();
  return <SpeakerDeck eventId={id} />;
}
