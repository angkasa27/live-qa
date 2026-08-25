import EventHeader from "@/components/EventHeader";
import NewEventForm from "@/components/NewEventForm";
import { requireSession } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireSession("/admin/events/new");
  return (
    <>
      <EventHeader name="Majelis baru" backHref="/admin" backLabel="Kembali" />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        <NewEventForm />
      </main>
    </>
  );
}
