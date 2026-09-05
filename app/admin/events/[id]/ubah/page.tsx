import { notFound } from "next/navigation";

import EditSessionForm from "@/components/admin/EditSessionForm";
import { Toolbar, ToolbarBack, ToolbarTitle } from "@/components/ui/toolbar";
import { requireEventAccess } from "@/lib/guard";
import { countQuestions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function UbahSesiPage({ params }: PageProps<"/admin/events/[id]/ubah">) {
  const { id } = await params;
  const { event, canEdit } = await requireEventAccess(`/admin/events/${id}/ubah`, id);
  // What a session *is* belongs to the superadmin; a grant buys running it. 404 rather than
  // 403, matching every other boundary here — an admin has no business knowing this is a page.
  if (!canEdit) notFound();

  return (
    <>
      <Toolbar variant="ink">
        <ToolbarBack href={`/admin/events/${event.id}`}>{""}</ToolbarBack>
        <ToolbarTitle>Ubah sesi</ToolbarTitle>
      </Toolbar>
      <EditSessionForm event={event} questionCount={await countQuestions(id)} />
    </>
  );
}
