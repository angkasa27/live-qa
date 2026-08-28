import AdminShell from "@/components/admin/Shell";
import NewEventForm from "@/components/NewEventForm";
import { requireSession } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireSession("/admin/events/new");
  return (
    <AdminShell back={{ href: "/admin", label: "Semua majelis" }} title="Majelis baru">
      <NewEventForm />
    </AdminShell>
  );
}
