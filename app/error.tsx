"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The last resort when a render or a server action throws. It offers `reset()` first because
 * most of what reaches here is a database round trip that failed once — a suspended Neon compute
 * that timed out waking, or a dropped connection — and trying again genuinely fixes it.
 *
 * The error itself is never shown. It can carry a query, a connection string fragment or a row
 * of someone's data, and none of that belongs on a student's phone.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ada yang tidak beres</h1>
      <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-muted-foreground">
        Halaman ini gagal dimuat. Coba lagi sebentar lagi.
      </p>
      {/* The digest is the only safe handle on the failure: it matches this render to a line in
          the server log without putting the message itself on screen. */}
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">Kode: {error.digest}</p>
      )}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="flex min-h-[3rem] items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="flex min-h-[3rem] items-center justify-center rounded-xl border border-border px-6 font-medium transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Semua majelis
        </Link>
      </div>
    </main>
  );
}
