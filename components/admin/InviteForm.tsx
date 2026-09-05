"use client";

import { KeyRound, Mail, User, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AssignList from "@/components/admin/AssignList";
import PageShell from "@/components/PageShell";
import Spinner from "@/components/Spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createAdmin, setAdminEvents } from "@/lib/admins";

/**
 * A new admin, and what they run, in one pass.
 *
 * The design writes this as an invitation — they receive a link and choose their own
 * password. There is no mail transport in this project yet, so the account is created with a
 * password the superadmin sets and passes on. The shape of the screen is the design's; only
 * the password field is standing in for the email that does not exist.
 */
export default function InviteForm({
  events,
}: {
  events: { id: string; name: string; startsAt: string; status: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staff, setStaff] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = name.trim() && email.trim() && password.length >= 8;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createAdmin({ name: name.trim(), email: email.trim(), password });
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    // The grant is a second write; a failure here leaves a real account with no sessions,
    // which is recoverable from their own screen, so it is reported rather than rolled back.
    if (staff.length > 0) {
      const grant = await setAdminEvents(res.data.id, staff);
      if (!grant.ok) {
        setBusy(false);
        return setError(`Akun dibuat, tetapi penugasan gagal: ${grant.error}`);
      }
    }
    router.push(`/admin/people/${res.data.id}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <PageShell
        action={
          <Button type="submit" size="lg" disabled={!ready || busy}>
            {busy ? <Spinner /> : <UserPlus aria-hidden />}
            {busy ? "Membuat…" : "Buat akun admin"}
          </Button>
        }
      >
        <h1 className="text-2xl font-bold tracking-[-0.025em]">Undang admin</h1>

        <Field className="mt-4.5 gap-2">
          <FieldLabel htmlFor="name">
            <User aria-hidden />
            Nama
          </FieldLabel>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. Rani Wijaya"
          />
        </Field>

        <Field className="mt-4 gap-2">
          <FieldLabel htmlFor="email">
            <Mail aria-hidden />
            Email
          </FieldLabel>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@contoh.com"
          />
          <FieldDescription>Ini yang ia pakai untuk masuk.</FieldDescription>
        </Field>

        <Field className="mt-4 gap-2">
          <FieldLabel htmlFor="password">
            <KeyRound aria-hidden />
            Kata sandi
          </FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
          />
          <FieldDescription>
            Anda menetapkannya sekarang dan menyampaikannya sendiri. Ia bisa memakainya
            langsung.
          </FieldDescription>
        </Field>

        <p className="mt-6 border-t border-border-soft pt-4.5 text-sm font-bold text-muted-foreground">
          Sesi yang ia jalankan
        </p>
        <div className="mt-2">
          <AssignList events={events} selected={staff} onChange={setStaff} disabled={busy} />
        </div>
        <FieldDescription className="mt-2">
          Bisa diubah kapan saja. Admin tanpa sesi tidak melihat apa pun.
        </FieldDescription>

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
