import ShareCard from "@/components/admin/ShareCard";
import PageShell from "@/components/PageShell";
import { Toolbar, ToolbarBack, ToolbarTitle } from "@/components/ui/toolbar";
import { requireEventAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: PageProps<"/admin/events/[id]/share">) {
  const { id } = await params;
  const { event } = await requireEventAccess(`/admin/events/${id}/share`, id);

  return (
    <>
      <Toolbar variant="ink">
        <ToolbarBack href={`/admin/events/${event.id}`}>{""}</ToolbarBack>
        <ToolbarTitle>Bagikan</ToolbarTitle>
      </Toolbar>
      <PageShell padded={false}>
        <ShareCard eventId={event.id} name={event.name} />
      </PageShell>
    </>
  );
}
