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
      className="flex min-h-[2.5rem] shrink-0 items-center gap-2 rounded-lg border border-border px-3.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-40"
    >
      {busy && <Spinner />}
      Keluar
    </button>
  );
}
