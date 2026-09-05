import { notFound } from "next/navigation";

import AccountForm from "@/components/admin/AccountForm";
import { Toolbar, ToolbarBack, ToolbarTitle } from "@/components/ui/toolbar";
import { getAdminEvents, listAdmins } from "@/lib/admins";
import { requireSuperadmin } from "@/lib/guard";
import { listEventsForAdmin } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: PageProps<"/admin/people/[id]">) {
  const { id } = await params;
  await requireSuperadmin(`/admin/people/${id}`);

  const admins = await listAdmins();
  const admin = admins.ok ? admins.data.find((a) => a.id === id) : undefined;
  // A superadmin is on every majelis already, so there is nothing on this screen for one.
  if (!admin || admin.role === "superadmin") notFound();

  const assigned = await getAdminEvents(admin.id);
  // Every majelis, because a superadmin sees all of them and this is their screen.
  const events = (await listEventsForAdmin(null)).map((e) => ({
    id: e.id,
    name: e.name,
    startsAt: e.startsAt,
    status: e.status,
  }));

  return (
    <>
      <Toolbar variant="ink">
        <ToolbarBack href="/admin/people">{""}</ToolbarBack>
        <ToolbarTitle>{admin.name}</ToolbarTitle>
      </Toolbar>
      <AccountForm
        admin={admin}
        events={events}
        assigned={assigned.ok ? assigned.data : []}
      />
    </>
  );
}
