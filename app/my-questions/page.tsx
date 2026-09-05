import { ArrowRight, MessageCircleDashed } from "lucide-react";
import Link from "next/link";

import BottomTabs from "@/components/BottomTabs";
import { AnswerBlock, Attribution } from "@/components/QuestionItem";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
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
      <header className="px-5 pt-5 pb-1">
        <h1 className="text-3xl leading-tight font-extrabold tracking-[-0.03em]">Pertanyaan saya</h1>
        <p className="mt-1.5 text-base leading-relaxed text-muted-foreground text-pretty">
          Tersimpan di perangkat ini saja. Jika data peramban dihapus atau Anda berganti
          perangkat, daftar ini hilang.
        </p>
      </header>

      <main className="page flex-1 pt-3">
        {mine.length === 0 ? (
          <Empty className="m-4 rounded-md border border-border">
            <EmptyMedia variant="icon">
              <MessageCircleDashed aria-hidden />
            </EmptyMedia>
            <EmptyDescription>Anda belum mengirim pertanyaan dari perangkat ini.</EmptyDescription>
            <Link
              href="/"
              className="mt-1 flex items-center gap-1.5 font-bold text-primary underline underline-offset-4"
            >
              Lihat majelis
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Empty>
        ) : (
          mine.map((q) => {
            const waiting = q.status === "submitted";
            return (
              <article
                key={q.id}
                className={`border-t border-border-soft px-5 py-5 ${waiting ? "bg-warn-soft" : ""}`}
              >
                {/* A hidden majelis 404s for the public, so its name is text, not a dead link. */}
                {q.eventHidden ? (
                  <span className="text-xs font-bold text-faint">{q.eventName}</span>
                ) : (
                  <Link
                    href={`/events/${q.eventId}`}
                    className="text-xs font-bold text-primary underline-offset-4 hover:underline"
                  >
                    {q.eventName}
                  </Link>
                )}

                <p className="mt-2 text-lg leading-normal font-semibold tracking-[-0.01em] whitespace-pre-wrap">
                  {q.body}
                </p>
                <p className="mt-2 text-xs text-faint">
                  <Attribution author={q.author} />
                </p>

                {/* Status is stated even when there is an answer: a question can be hidden
                    after it was answered, and the asker should still see where it stands. */}
                {q.status === "hidden" && (
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    <span className="mr-1.5 rounded-full border border-border px-2 py-[3px] text-2xs font-bold">
                      tidak ditampilkan
                    </span>
                    Pertanyaan ini tidak tampil di daftar publik. Jawaban masih mungkin menyusul.
                  </p>
                )}

                {q.answer ? (
                  <AnswerBlock answer={q.answer} edited={q.edited} />
                ) : (
                  q.status !== "hidden" && (
                    <p
                      className={`mt-3 text-base ${waiting ? "font-bold text-warn" : "text-muted-foreground"}`}
                    >
                      {waiting ? "Menunggu review admin" : "Sudah disetujui, belum dijawab."}
                    </p>
                  )
                )}
              </article>
            );
          })
        )}
      </main>

      <BottomTabs current="/my-questions" />
    </>
  );
}
