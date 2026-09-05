import { BookOpen, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Reached by every `notFound()` in the app, and now by ordinary use: a majelis can be deleted
 * or hidden, so links already shared land here. The wording covers both without saying which,
 * because "this was deleted" and "this is hidden" are the same fact to a student and the
 * difference is not theirs to know.
 */
export default function NotFound() {
  return (
    <main className="page flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
      <p className="text-2xs font-bold tracking-[0.12em] text-faint uppercase">404</p>
      <h1 className="mt-2 text-3xl leading-tight font-extrabold tracking-[-0.03em]">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-3 max-w-prose text-base leading-relaxed text-muted-foreground text-pretty">
        Majelis ini mungkin sudah dihapus, atau tautannya keliru.
      </p>
      <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
        <Button size="lg" render={<Link href="/" />}>
          <BookOpen aria-hidden />
          Lihat semua majelis
        </Button>
        <Button variant="outline" size="lg" render={<Link href="/pertanyaan-saya" />}>
          <MessageCircle aria-hidden />
          Pertanyaan saya
        </Button>
      </div>
    </main>
  );
}
