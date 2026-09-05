"use client";

import { CircleSlash, KeyRound, Mail, Trash2, User, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AssignList from "@/components/admin/AssignList";
import Confirm from "@/components/admin/Confirm";
import PageShell from "@/components/PageShell";
import Spinner from "@/components/Spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteAdmin,
  resetAdminPassword,
  setAdminActive,
  setAdminEvents,
  type Admin,
} from "@/lib/admins";
import type { Result } from "@/lib/actions";

/**
 * One person, on one screen.
 *
 * This unpacks four modals that used to sit on top of a list: reset, assign, deactivate,
 * delete. A modal per action meant the list could never answer "what does this person
 * actually have?" without opening three of them.
 *
 * Assignment saves with the name and email under one Simpan; the three account-state acts
 * (reset, deactivate, delete) are immediate and each confirms for itself, because none of
 * them is a field you edit — they are things you do, and two of them are hard to undo.
 */
export default function AccountForm({
  admin,
  events,
  assigned,
}: {
  admin: Admin;
  events: { id: string; name: string; startsAt: string; status: string }[];
  assigned: string[];
}) {
  const router = useRouter();
  const [staff, setStaff] = useState(assigned);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"deactivate" | "delete" | null>(null);
  const [typed, setTyped] = useState("");

  const key = (ids: string[]) => [...ids].sort().join(",");
  // Assignment is the only editable field here, so it is the only thing Simpan can be dirty
  // about. Name and email are shown because the screen is about this person; neither has a
  // write path in lib/admins.ts, and a box that discards what you type is worse than a
  // disabled one.
  const dirty = key(staff) !== key(assigned);

  async function run(k: string, act: () => Promise<Result<unknown>>, ok?: string) {
    setBusy(k);
    setError(null);
    setNote(null);
    const res = await act();
    setBusy(null);
    if (!res.ok) return setError(res.error);
    if (ok) setNote(ok);
    router.refresh();
    return true;
  }

  return (
    <PageShell
      action={
        <Button
          size="lg"
          disabled={!dirty || busy !== null}
          onClick={() => run("save", () => setAdminEvents(admin.id, staff))}
        >
          {busy === "save" && <Spinner />}
          {busy === "save" ? "Menyimpan…" : dirty ? "Simpan" : "Tidak ada perubahan"}
        </Button>
      }
    >
      <Field className="gap-2">
        <FieldLabel htmlFor="name">
          <User aria-hidden />
          Nama
        </FieldLabel>
        <Input id="name" value={admin.name} disabled />
      </Field>

      <Field className="mt-4 gap-2">
        <FieldLabel htmlFor="email">
          <Mail aria-hidden />
          Email
        </FieldLabel>
        <Input id="email" value={admin.email} disabled />
        <FieldDescription>
          Nama dan email ditetapkan saat akun dibuat. Belum ada cara mengubahnya dari sini.
        </FieldDescription>
      </Field>

      <p className="mt-6 border-t border-border-soft pt-4.5 text-sm font-bold text-muted-foreground">
        Kata sandi
      </p>

      {/*
       * The design asks for an emailed reset link. There is no mail transport in this
       * project yet, so this stays what it has always been: the superadmin sets one and
       * passes it on. Swap this block for a "Kirim tautan" button the day mail exists.
       */}
      <Field className="mt-3 gap-2">
        <FieldLabel htmlFor="password">
          <KeyRound aria-hidden />
          Kata sandi baru
        </FieldLabel>
        <Input
          id="password"
          type="password"
          value={password}
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          onChange={(e) => setPassword(e.target.value)}
        />
        <FieldDescription>
          Anda menetapkannya lalu menyampaikannya sendiri kepada {admin.name.split(" ")[0]}.
        </FieldDescription>
      </Field>
      <Button
        variant="outline"
        size="lg"
        className="mt-2.5"
        disabled={password.length < 8 || busy !== null}
        onClick={() =>
          run("password", () => resetAdminPassword(admin.id, password), "Kata sandi diganti.").then(
            (ok) => ok && setPassword("")
          )
        }
      >
        {busy === "password" ? <Spinner /> : <KeyRound aria-hidden />}
        Ganti kata sandi
      </Button>

      <p className="mt-6 border-t border-border-soft pt-4.5 text-sm font-bold text-muted-foreground">
        Sesi yang ia jalankan
      </p>
      <div className="mt-2">
        <AssignList
          events={events}
          selected={staff}
          onChange={setStaff}
          disabled={busy !== null}
        />
      </div>

      <p className="mt-6 border-t border-border-soft pt-4.5 text-sm font-bold text-muted-foreground">
        Akses
      </p>
      <Button
        variant={admin.banned ? "outline" : "warning"}
        size="lg"
        className="mt-3"
        disabled={busy !== null}
        onClick={() =>
          admin.banned
            ? run("ban", () => setAdminActive(admin.id, true))
            : setConfirming("deactivate")
        }
      >
        {busy === "ban" ? <Spinner /> : admin.banned ? <UserCheck aria-hidden /> : <CircleSlash aria-hidden />}
        {admin.banned ? "Aktifkan kembali" : "Nonaktifkan akun"}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        {admin.banned
          ? "Akun ini sedang tidak bisa masuk. Mengaktifkannya mengembalikan akses ke sesi yang sama."
          : "Tidak bisa masuk lagi. Sesi dan jawaban yang sudah ia terbitkan tetap ada. Bisa diaktifkan lagi kapan saja."}
      </p>

      <div className="mt-6 border-t border-border-soft pt-4.5">
        <Button
          variant="destructive"
          size="lg"
          disabled={busy !== null}
          onClick={() => setConfirming("delete")}
        >
          <Trash2 aria-hidden />
          Hapus permanen
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Menghapus akunnya memutus jejak siapa yang menulis jawabannya — nonaktifkan saja,
          kecuali akun ini memang belum pernah dipakai.
        </p>
      </div>

      <div aria-live="polite">
        {note && (
          <Alert variant="info" className="mt-4">
            <AlertDescription>{note}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <Confirm
        open={confirming === "deactivate"}
        onOpenChange={(v) => !v && setConfirming(null)}
        title="Nonaktifkan akun ini?"
        description={`${admin.name} tidak bisa masuk lagi. Sesi dan jawaban yang sudah ia terbitkan tetap ada, dan Anda bisa mengaktifkannya kembali kapan saja.`}
        confirmLabel="Nonaktifkan"
        busyLabel="Menyimpan…"
        busy={busy === "ban"}
        onConfirm={async () => {
          if (await run("ban", () => setAdminActive(admin.id, false))) setConfirming(null);
        }}
      />

      <Confirm
        open={confirming === "delete"}
        onOpenChange={(v) => {
          if (busy === "delete") return;
          setConfirming(v ? "delete" : null);
          if (!v) setTyped("");
        }}
        title="Hapus akun ini permanen?"
        description={
          <>
            Akun <strong className="font-bold text-destructive">{admin.name}</strong> dihapus.
            Jejak siapa yang menulis jawaban yang sudah terbit ikut terputus. Tidak bisa
            dibatalkan.
          </>
        }
        confirmLabel="Hapus permanen"
        busyLabel="Menghapus…"
        busy={busy === "delete"}
        disabled={typed.trim() !== admin.name.trim()}
        onConfirm={async () => {
          setBusy("delete");
          const res = await deleteAdmin(admin.id);
          if (!res.ok) {
            setBusy(null);
            setConfirming(null);
            return setError(res.error);
          }
          router.push("/admin/people");
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="confirm-name" className="block">
            Ketik <span className="font-bold">{admin.name}</span> untuk melanjutkan
          </Label>
          <Input
            id="confirm-name"
            value={typed}
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
      </Confirm>
    </PageShell>
  );
}
