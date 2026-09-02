import Link from "next/link";
import BottomTabs from "@/components/BottomTabs";
import { AnswerBlock } from "@/components/QuestionCard";
import { askerToken } from "@/lib/asker";
import { listMine } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * The answer to "did anyone ever answer my question?", which is the whole reason the app
 * outlives the session. No account: the browser holds an opaque token and nothing else.
 */
export default async function MyQuestionsPage() {
  const token = await askerToken();
  const mine = token ? await listMine(token) : [];

  return (
    <>
      <header className="border-b border-border-soft bg-card px-4 pt-[18px] pb-3.5 sm:px-6">
        <h1 className="font-serif text-[1.625rem] leading-tight font-medium tracking-tight">
          Pertanyaan saya
        </h1>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground text-pretty">
          Tersimpan di perangkat ini saja. Jika data peramban dihapus atau Anda berganti perangkat,
          daftar ini hilang.
        </p>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-3.5 sm:px-6">
        {mine.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
            <p className="text-muted-foreground">Anda belum mengirim pertanyaan dari perangkat ini.</p>
            <Link href="/" className="mt-2 inline-block font-semibold text-primary underline underline-offset-4">
              Lihat majelis →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {mine.map((q) => {
              const waiting = q.status === "submitted";
              return (
                <li
                  key={q.id}
                  className={`rounded-2xl border p-3.5 ${
                    waiting
                      ? "border-warn-border bg-warn-soft"
                      : q.status === "hidden"
                        ? "border-border bg-background"
                        : "border-border bg-card"
                  }`}
                >
                  {/* A hidden majelis 404s for the public, so its name is text, not a dead link. */}
                  {q.eventHidden ? (
                    <span className="text-xs font-semibold text-faint">{q.eventName}</span>
                  ) : (
                    <Link href={`/events/${q.eventId}`} className="text-xs font-semibold text-primary">
                      {q.eventName}
                    </Link>
                  )}
                  <p className="mt-2 font-serif text-base leading-relaxed whitespace-pre-wrap">{q.body}</p>

                  {/* Status is stated even when there is an answer: a question can be hidden
                      after it was answered, and the asker should still see where it stands. */}
                  {q.status === "hidden" && (
                    <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      <span className="mr-1.5 rounded-full border border-border px-2 py-[3px] text-[0.6875rem] font-semibold uppercase">
                        tidak ditampilkan
                      </span>
                      Pertanyaan ini tidak tampil di daftar publik. Jawaban masih mungkin menyusul.
                    </p>
                  )}

                  {q.answer ? (
                    <AnswerBlock answer={q.answer} edited={q.edited} />
                  ) : (
                    q.status !== "hidden" && (
                      <p className={`mt-3 text-[0.8125rem] ${waiting ? "font-semibold text-warn" : "text-muted-foreground"}`}>
                        {waiting ? "Menunggu review admin" : "Sudah disetujui, belum dijawab."}
                      </p>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <BottomTabs current="/pertanyaan-saya" />
    </>
  );
}
