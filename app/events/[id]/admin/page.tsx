import { notFound } from "next/navigation";
import AdminBoard from "@/components/AdminBoard";
import EventHeader from "@/components/EventHeader";
import { getEvent } from "@/lib/queries";
import { requireSession } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }: PageProps<"/events/[id]/admin">) {
  const { id } = await params;
  await requireSession(`/events/${id}/admin`);

  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <>
      <EventHeader name={event.name} backHref={`/events/${event.id}`} backLabel="Kembali ke sesi" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-5 sm:px-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold sm:text-2xl">Jawaban</h2>
          <p className="text-sm text-muted">
            {event.acceptingQuestions ? "Menerima pertanyaan" : "Tidak menerima pertanyaan"} ·
            review {event.moderation === "manual" ? "manual" : "otomatis"}
          </p>
        </div>
        <AdminBoard eventId={event.id} />
      </main>
    </>
  );
}
