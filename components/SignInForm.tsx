"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Spinner from "@/components/Spinner";
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
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 min-h-[2.75rem] w-full rounded-lg border border-border bg-card px-3 outline-none transition-colors focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Kata sandi
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 min-h-[2.75rem] w-full rounded-lg border border-border bg-card px-3 outline-none transition-colors focus:border-primary"
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
        {busy && <Spinner />}
        {busy ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
