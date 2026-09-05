import NewEventForm from "@/components/NewEventForm";
import { Toolbar, ToolbarBack, ToolbarTitle } from "@/components/ui/toolbar";
import { requireSuperadmin } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  // Making a session is the superadmin's; an admin is handed sessions to run.
  await requireSuperadmin("/admin/events/new");
  return (
    <>
      <Toolbar variant="ink">
        <ToolbarBack href="/admin">{""}</ToolbarBack>
        <ToolbarTitle>Sesi baru</ToolbarTitle>
      </Toolbar>
      <NewEventForm />
    </>
  );
}
