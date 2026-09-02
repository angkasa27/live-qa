import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitForm from "@/components/SubmitForm";
import { getEvent } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * The ask sheet. Sheet header per the design: a title and "Tutup" on the right, no back arrow —
 * closing puts you back on the majelis, which is the only place this can be opened from.
 */
export default async function AskPage({ params }: PageProps<"/events/[id]/tanya"> ) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event || !event.acceptingQuestions) notFound();

  return (
    <>
      <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 border-b border-border-soft bg-card px-3 sm:px-4">
        <h1 className="min-w-0 flex-1 truncate pl-2 font-bold">Kirim pertanyaan</h1>
        <Link
          href={`/events/${event.id}`}
          className="flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Tutup
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4 sm:px-6">
        <p className="mb-3 text-sm text-muted-foreground">
          {event.name} · {event.speaker}
        </p>
        <SubmitForm eventId={event.id} moderated={event.moderation === "manual"} />
      </main>
    </>
  );
}
