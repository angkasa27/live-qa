"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";
import Spinner from "@/components/Spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";

export default function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn.email({ email, password });
    setBusy(false);
    if (res.error) return setError("Email atau kata sandi salah.");
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          className="mt-2"
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="password">Kata sandi</Label>
        <Input
          className="mt-2"
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div aria-live="polite" className="min-h-[1.25rem]">
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {busy ? <Spinner /> : <LogIn className="h-[18px] w-[18px]" aria-hidden />}
        {busy ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
