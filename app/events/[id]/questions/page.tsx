import Link from "next/link";
import { notFound } from "next/navigation";
import EventHeader from "@/components/EventHeader";
import QuestionList from "@/components/QuestionList";
import { getEvent } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function QuestionsPage({ params }: PageProps<"/events/[id]/questions">) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <>
      <EventHeader
        name={event.name}
        backHref={`/events/${event.id}`}
        backLabel="Kembali ke formulir pertanyaan"
        action={
          event.acceptingQuestions ? (
            <Link
              href={`/events/${event.id}`}
              className="flex min-h-[2.75rem] shrink-0 items-center rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Tanya
            </Link>
          ) : undefined
        }
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-5 sm:px-6">
        <h2 className="mb-4 text-xl font-semibold sm:text-2xl">Pertanyaan</h2>
        <QuestionList
          eventId={event.id}
          youtubeId={event.youtubeId}
          canAsk={event.acceptingQuestions}
        />
      </main>
    </>
  );
}
