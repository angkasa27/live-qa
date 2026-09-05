import ShareCard from "@/components/admin/ShareCard";
import PageShell from "@/components/PageShell";
import { Toolbar, ToolbarBack, ToolbarTitle } from "@/components/ui/toolbar";
import { requireEventAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function TayangkanPage({
  params,
}: PageProps<"/admin/events/[id]/tayangkan">) {
  const { id } = await params;
  const { event } = await requireEventAccess(`/admin/events/${id}/tayangkan`, id);

  return (
    <>
      <Toolbar variant="ink">
        <ToolbarBack href={`/admin/events/${event.id}`}>{""}</ToolbarBack>
        <ToolbarTitle>Tayangkan</ToolbarTitle>
      </Toolbar>
      <PageShell padded={false}>
        <ShareCard eventId={event.id} name={event.name} />
      </PageShell>
    </>
  );
}
