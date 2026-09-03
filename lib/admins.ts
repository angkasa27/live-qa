"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { APIError } from "better-auth/api";
import { auth, isSuperadmin } from "./auth.ts";
import { query } from "./db.ts";
import type { Result } from "./actions.ts";

/**
 * Account management. Superadmin only, and every one of these is refused by better-auth itself
 * for a plain admin (lib/auth.ts maps `admin` to a role with no statements). The guard below is
 * so the screen can say so in Indonesian instead of surfacing a thrown APIError.
 *
 * Server actions rather than the browser-side adminClient plugin: every other write in this app
 * is a server action returning Result, and the error strings belong in one place.
 */

export type Admin = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  /** Deactivated: keeps the account and everything it created, refuses the sign-in. */
  banned: boolean;
  createdAt: string;
};

const fail = (error: string): Result<never> => ({ ok: false, error });
const done = <T>(data: T): Result<T> => ({ ok: true, data });

async function superadminHeaders() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session || !isSuperadmin(session.user)) return null;
  return { headers: h, self: session.user.id };
}

/** Turns better-auth's own failures into something a person can read. */
function reason(err: unknown) {
  if (err instanceof APIError) {
    const message = String((err.body as { message?: string })?.message ?? err.message);
    if (/already exists/i.test(message)) return "Email itu sudah dipakai.";
    if (/password/i.test(message)) return "Kata sandi minimal 8 karakter.";
    if (/email/i.test(message)) return "Alamat email tidak valid.";
    return message;
  }
  return err instanceof Error ? err.message : "Gagal.";
}

export async function listAdmins(): Promise<Result<Admin[]>> {
  const ctx = await superadminHeaders();
  if (!ctx) return fail("Tidak diizinkan.");

  const res = await auth.api.listUsers({
    headers: ctx.headers,
    query: { limit: 200, sortBy: "createdAt", sortDirection: "desc" },
  });

  return done(
    res.users.map((u) => {
      const row = u as typeof u & { role?: string | null; banned?: boolean | null };
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role ?? null,
        banned: row.banned === true,
        createdAt: new Date(row.createdAt).toISOString(),
      };
    }),
  );
}

export async function createAdmin(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Result<{ id: string }>> {
  const ctx = await superadminHeaders();
  if (!ctx) return fail("Tidak diizinkan.");

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return fail("Nama wajib diisi.");
  if (!email) return fail("Email wajib diisi.");
  if (input.password.length < 8) return fail("Kata sandi minimal 8 karakter.");

  try {
    // Always `admin`: a second superadmin is not something this screen makes. Promoting one is
    // `npm run admin:create` against an existing email, which is deliberate friction.
    const { user } = await auth.api.createUser({
      headers: ctx.headers,
      body: { name, email, password: input.password, role: "admin" },
    });
    revalidatePath("/admin/pengguna");
    return done({ id: user.id });
  } catch (err) {
    return fail(reason(err));
  }
}

export async function resetAdminPassword(userId: string, password: string): Promise<Result> {
  const ctx = await superadminHeaders();
  if (!ctx) return fail("Tidak diizinkan.");
  if (password.length < 8) return fail("Kata sandi minimal 8 karakter.");

  try {
    await auth.api.setUserPassword({
      headers: ctx.headers,
      body: { userId, newPassword: password },
    });
    return done(undefined);
  } catch (err) {
    return fail(reason(err));
  }
}

/** Deactivating keeps the account and its majelis; it only refuses the sign-in. */
export async function setAdminActive(userId: string, active: boolean): Promise<Result> {
  const ctx = await superadminHeaders();
  if (!ctx) return fail("Tidak diizinkan.");
  if (userId === ctx.self) return fail("Anda tidak bisa menonaktifkan akun sendiri.");

  try {
    if (active) await auth.api.unbanUser({ headers: ctx.headers, body: { userId } });
    else await auth.api.banUser({ headers: ctx.headers, body: { userId } });
    revalidatePath("/admin/pengguna");
    return done(undefined);
  } catch (err) {
    return fail(reason(err));
  }
}

/**
 * Removes the account. Their majelis survive — deleting an admin must never destroy a session or
 * the questions on it — and are handed back to nobody, which leaves them with the superadmin.
 *
 * `events.created_by` carries no foreign key, so nothing clears it for us; a stale user id would
 * strand those events with an owner who can never sign in again. Clear it first, then delete.
 */
export async function deleteAdmin(userId: string): Promise<Result> {
  const ctx = await superadminHeaders();
  if (!ctx) return fail("Tidak diizinkan.");
  if (userId === ctx.self) return fail("Anda tidak bisa menghapus akun sendiri.");

  try {
    await query(`update events set created_by = null where created_by = $1`, [userId]);
    await auth.api.removeUser({ headers: ctx.headers, body: { userId } });
    revalidatePath("/admin/pengguna");
    revalidatePath("/admin");
    return done(undefined);
  } catch (err) {
    return fail(reason(err));
  }
}
