"use client";

import { LogOut } from "lucide-react";
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
         an admin screen is never "leave". Icon-only: the header is tight, and a door with an
         arrow is unambiguous. The name lives in aria-label, not in visible text. */
      aria-label="Keluar"
      className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#b8b1a6] transition-colors hover:text-background disabled:opacity-40"
    >
      {busy ? <Spinner /> : <LogOut className="h-[18px] w-[18px]" aria-hidden />}
    </button>
  );
}
