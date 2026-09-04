import SpeakerDeck from "@/components/SpeakerDeck";
import { requireEventAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

// The syaikh signs in with an admin account; there is no separate speaker account. ROADMAP §2.
export default async function SpeakerPage({ params }: PageProps<"/admin/events/[id]/speaker">) {
  const { id } = await params;
  await requireEventAccess(`/admin/events/${id}/speaker`, id);
  return <SpeakerDeck eventId={id} />;
}
