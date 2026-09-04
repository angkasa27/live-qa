import AdminShell from "@/components/admin/Shell";
import NewEventForm from "@/components/NewEventForm";
import { requireSuperadmin } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireSuperadmin("/admin/events/new");
  return (
    <AdminShell back={{ href: "/admin", label: "Semua majelis" }} title="Sesi baru">
      <NewEventForm />
    </AdminShell>
  );
}
