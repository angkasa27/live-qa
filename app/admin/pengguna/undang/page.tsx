import InviteForm from "@/components/admin/InviteForm";
import { Toolbar, ToolbarBack } from "@/components/ui/toolbar";
import { requireSuperadmin } from "@/lib/guard";
import { listEventsForAdmin } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function UndangPage() {
  await requireSuperadmin("/admin/pengguna/undang");
  const events = (await listEventsForAdmin(null)).map((e) => ({
    id: e.id,
    name: e.name,
    startsAt: e.startsAt,
    status: e.status,
  }));

  return (
    <>
      <Toolbar variant="ink">
        <ToolbarBack href="/admin/pengguna">Batal</ToolbarBack>
      </Toolbar>
      <InviteForm events={events} />
    </>
  );
}
