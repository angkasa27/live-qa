import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/Shell";
import EditEventForm from "@/components/EditEventForm";
import { countQuestions, getEvent } from "@/lib/queries";
import { requireSession } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: PageProps<"/admin/events/[id]/edit">) {
  const { id } = await params;
  await requireSession(`/admin/events/${id}/edit`);

  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <AdminShell
      back={{ href: `/admin/events/${id}`, label: event.name }}
      title="Ubah detail"
      subtitle="Status dan review pertanyaan diatur dari halaman majelis."
    >
      <EditEventForm event={event} questionCount={await countQuestions(id)} />
    </AdminShell>
  );
}
