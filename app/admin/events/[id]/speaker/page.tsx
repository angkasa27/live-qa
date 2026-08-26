import { notFound } from "next/navigation";
import SpeakerDeck from "@/components/SpeakerDeck";
import { getEvent } from "@/lib/queries";
import { requireSession } from "@/lib/guard";

export const dynamic = "force-dynamic";

// The syaikh signs in with an admin account; there is no separate speaker account. ROADMAP §2.
export default async function SpeakerPage({ params }: PageProps<"/admin/events/[id]/speaker">) {
  const { id } = await params;
  await requireSession(`/admin/events/${id}/speaker`);
  if (!(await getEvent(id))) notFound();
  return <SpeakerDeck eventId={id} />;
}
