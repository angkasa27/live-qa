"use client";

import { BookOpen, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * The last resort when a render or a server action throws. It offers `reset()` first because
 * most of what reaches here is a database round trip that failed once — a suspended Neon
 * compute that timed out waking, or a dropped connection — and trying again genuinely fixes it.
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
    <main className="page flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">
        Ada yang tidak beres
      </h1>
      <p className="mt-3 max-w-prose text-base text-muted-foreground text-pretty">
        Halaman ini gagal dimuat. Coba lagi sebentar lagi.
      </p>
      {/* The digest is the only safe handle on the failure: it matches this render to a line in
          the server log without putting the message itself on screen. */}
      {error.digest && <p className="mt-2 text-xs tabular-nums text-faint">Kode: {error.digest}</p>}
      <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
        <Button size="lg" onClick={reset}>
          <RotateCw aria-hidden />
          Coba lagi
        </Button>
        <Button variant="outline" size="lg" render={<Link href="/" />}>
          <BookOpen aria-hidden />
          Semua majelis
        </Button>
      </div>
    </main>
  );
}
