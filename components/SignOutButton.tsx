"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Spinner from "@/components/Spinner";
import { signOut } from "@/lib/auth-client";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      onClick={async () => {
        setBusy(true);
        await signOut();
        router.push("/");
        router.refresh();
      }}
      disabled={busy}
      /* Lives in the ink admin header, so it is light-on-dark and quiet — the primary action on
         an admin screen is never "leave". Text rather than a door glyph: it sits opposite the
         product's name, where an icon alone would read as a control rather than a way out. */
      className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#b8b1a6] transition-colors hover:text-background disabled:opacity-40"
    >
      {busy && <Spinner />}
      Keluar
    </button>
  );
}
