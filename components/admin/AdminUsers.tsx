"use client";

import { KeyRound, Trash2, UserPlus, UserX, UserCheck } from "lucide-react";
import { useState } from "react";
import Confirm from "@/components/admin/Confirm";
import Field from "@/components/admin/Field";
import FormSection from "@/components/admin/FormSection";
import Modal from "@/components/admin/Modal";
import Spinner from "@/components/Spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createAdmin,
  deleteAdmin,
  listAdmins,
  resetAdminPassword,
  setAdminActive,
  type Admin,
} from "@/lib/admins";
import type { Result } from "@/lib/actions";

/**
 * The superadmin's one screen. Everything on it is refused server-side for anyone else
 * (lib/admins.ts, and better-auth under that), so this is presentation, not protection.
 *
 * `admins` arrives from the page and is replaced on every change rather than patched in place:
 * this list is a handful of rows read once by one person, and a reconciliation dance to save a
 * round trip would be more code than the round trip.
 */
export default function AdminUsers({ admins, self }: { admins: Admin[]; self: string }) {
  const [rows, setRows] = useState(admins);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<Admin | null>(null);
  const [removing, setRemoving] = useState<Admin | null>(null);

  /** Every write takes this shape: run it, show the message or take the fresh list. */
  async function run(key: string, act: () => Promise<Result<unknown>>) {
    setBusy(key);
    setError(null);
    try {
      const res = await act();
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      const fresh = await listAdmins();
      if (fresh.ok) setRows(fresh.data);
      return true;
    } catch {
      setError("Gagal menghubungi server. Coba lagi.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div aria-live="polite">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <ul className="space-y-2.5">
        {rows.map((a) => {
          const isSelf = a.id === self;
          const superadmin = a.role === "superadmin";
          return (
            <li key={a.id} className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.name}</p>
                  <p className="truncate text-[0.8125rem] text-muted-foreground">{a.email}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {superadmin && <Badge variant="accent">Superadmin</Badge>}
                  {a.banned && <Badge variant="outline">Nonaktif</Badge>}
                </div>
              </div>

              {/* Nothing to do to your own account here: deactivating or deleting the account
                  you are signed in as is the one move with no way back, so it isn't offered. */}
              {!isSelf && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setResetting(a)}>
                    <KeyRound className="h-4 w-4" aria-hidden />
                    Kata sandi
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === a.id}
                    onClick={() => run(a.id, () => setAdminActive(a.id, a.banned))}
                  >
                    {busy === a.id ? (
                      <Spinner />
                    ) : a.banned ? (
                      <UserCheck className="h-4 w-4" aria-hidden />
                    ) : (
                      <UserX className="h-4 w-4" aria-hidden />
                    )}
                    {a.banned ? "Aktifkan" : "Nonaktifkan"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setRemoving(a)}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Hapus
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
        <UserPlus className="h-[18px] w-[18px]" aria-hidden />
        Admin baru
      </Button>

      <NewAdminModal
        open={adding}
        onClose={() => setAdding(false)}
        busy={busy === "new"}
        onSubmit={async (input) => {
          if (await run("new", () => createAdmin(input))) setAdding(false);
        }}
      />

      <PasswordModal
        admin={resetting}
        onClose={() => setResetting(null)}
        busy={busy === "password"}
        onSubmit={async (password) => {
          if (!resetting) return;
          if (await run("password", () => resetAdminPassword(resetting.id, password)))
            setResetting(null);
        }}
      />

      <Confirm
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Hapus admin ini?"
        description={
          <>
            {removing?.name} tidak akan bisa masuk lagi. Majelis yang mereka buat tetap ada dan
            berpindah ke superadmin.
          </>
        }
        confirmLabel="Hapus admin"
        busyLabel="Menghapus…"
        busy={busy === "delete"}
        onConfirm={async () => {
          if (!removing) return;
          if (await run("delete", () => deleteAdmin(removing.id))) setRemoving(null);
        }}
      />
    </div>
  );
}

function NewAdminModal({
  open,
  onClose,
  busy,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onSubmit: (input: { name: string; email: string; password: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Modal open={open} onClose={onClose} title="Admin baru">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, email, password });
        }}
      >
        <Field id="admin-name" label="Nama" required value={name} onChange={(e) => setName(e.target.value)} />
        <Field
          id="admin-email"
          label="Email"
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormSection label="Akses" />
        <Field
          id="admin-password"
          label="Kata sandi"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="Minimal 8 karakter. Sampaikan sendiri ke admin yang bersangkutan."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Spinner />}
          {busy ? "Membuat…" : "Buat admin"}
        </Button>
      </form>
    </Modal>
  );
}

function PasswordModal({
  admin,
  onClose,
  busy,
  onSubmit,
}: {
  admin: Admin | null;
  onClose: () => void;
  busy: boolean;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <Modal open={admin !== null} onClose={onClose} title={`Kata sandi ${admin?.name ?? ""}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(password);
        }}
      >
        <Field
          id="new-password"
          label="Kata sandi baru"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="Minimal 8 karakter. Mereka tidak diberi tahu otomatis."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Spinner />}
          {busy ? "Menyimpan…" : "Simpan kata sandi"}
        </Button>
      </form>
    </Modal>
  );
}
