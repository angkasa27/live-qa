import Link from "next/link";
import EventHeader from "@/components/EventHeader";
import { AnswerBlock } from "@/components/QuestionCard";
import { askerToken } from "@/lib/asker";
import { listMine } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * The answer to "did anyone ever answer my question?" — which is the whole reason the app
 * outlives the session. No account: the browser holds an opaque token and nothing else.
 */
export default async function MyQuestionsPage() {
  const token = await askerToken();
  const mine = token ? await listMine(token) : [];

  return (
    <>
      <EventHeader name="Pertanyaan saya" backHref="/" backLabel="Semua majelis" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-5 sm:px-6">
        {mine.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
            <p className="text-muted">Anda belum mengirim pertanyaan dari perangkat ini.</p>
            <Link href="/" className="mt-2 inline-block font-medium text-accent underline underline-offset-4">
              Lihat majelis →
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              Tersimpan di perangkat ini saja. Kalau Anda menghapus data peramban atau berganti
              perangkat, daftar ini ikut hilang.
            </p>
            <ul className="space-y-3">
              {mine.map((q) => (
                <li key={q.id} className="rounded-xl border border-border bg-surface p-4">
                  <Link href={`/events/${q.eventId}`} className="text-sm text-muted underline underline-offset-4">
                    {q.eventName}
                  </Link>
                  <p className="mt-2 whitespace-pre-wrap text-[1.0625rem] leading-relaxed">{q.body}</p>
                  {q.answer ? (
                    <AnswerBlock answer={q.answer} />
                  ) : (
                    <p className="mt-3 text-sm text-muted">
                      {q.status === "submitted" ? "Menunggu review admin." : "Belum dijawab."}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
