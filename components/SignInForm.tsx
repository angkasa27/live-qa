"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
          className="mt-2 min-h-[2.75rem] w-full rounded-lg border border-border bg-surface px-3 outline-none transition-colors focus:border-accent"
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
          className="mt-2 min-h-[2.75rem] w-full rounded-lg border border-border bg-surface px-3 outline-none transition-colors focus:border-accent"
        />
      </div>

      <div aria-live="polite" className="min-h-[1.25rem]">
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="min-h-[3rem] w-full rounded-xl bg-accent font-semibold text-accent-fg transition-opacity disabled:opacity-40"
      >
        {busy ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
