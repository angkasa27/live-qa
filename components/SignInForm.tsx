"use client";

import { LogIn, Mail, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import PageShell from "@/components/PageShell";
import Spinner from "@/components/Spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
    // Deliberately one message for both: saying which half was wrong tells an attacker
    // which addresses have accounts.
    if (res.error) return setError("Email atau kata sandi salah.");
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <PageShell
        action={
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? <Spinner /> : <LogIn aria-hidden />}
            {busy ? "Memproses…" : "Masuk"}
          </Button>
        }
      >
        <h1 className="text-3xl leading-tight font-extrabold tracking-[-0.03em]">Masuk</h1>
        <p className="mt-1.5 text-base text-muted-foreground">
          Halaman ini untuk admin dan pemateri. Peserta tidak perlu akun.
        </p>

        <Field className="mt-6 gap-2">
          <FieldLabel htmlFor="email">
            <Mail aria-hidden />
            Email
          </FieldLabel>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field className="mt-4 gap-2">
          <FieldLabel htmlFor="password">
            <KeyRound aria-hidden />
            Kata sandi
          </FieldLabel>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <div aria-live="polite">
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </PageShell>
    </form>
  );
}
