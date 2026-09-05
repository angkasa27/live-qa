"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Spinner from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

/**
 * Lives in the ink admin bar, as an icon beside the other bar controls. It was text
 * ("Keluar") while the bar had room for it; the redesign gives the bar a title and two
 * icons, and the way out is the least of the three — an icon with a label for screen
 * readers, not a word competing with the session's name.
 */
export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Keluar"
      disabled={busy}
      className="text-on-bar active:bg-white/12"
      onClick={async () => {
        setBusy(true);
        await signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {busy ? <Spinner /> : <LogOut aria-hidden />}
    </Button>
  );
}
