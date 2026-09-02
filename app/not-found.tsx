import Link from "next/link";

/**
 * Reached by every `notFound()` in the app, and now by ordinary use: a majelis can be deleted or
 * hidden, so links already shared land here. The wording covers both without saying which,
 * because "this was deleted" and "this is hidden" are the same fact to a student and the
 * difference is not theirs to know.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-muted-foreground">
        Majelis ini mungkin sudah dihapus, atau tautannya keliru.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="flex min-h-[3rem] items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Lihat semua majelis
        </Link>
        <Link
          href="/pertanyaan-saya"
          className="flex min-h-[3rem] items-center justify-center rounded-xl border border-border px-6 font-medium transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Pertanyaan saya
        </Link>
      </div>
    </main>
  );
}
