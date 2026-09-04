"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { APIError } from "better-auth/api";
import { auth, isSuperadmin } from "./auth.ts";
import { pool, query } from "./db.ts";
import { adminEventIds } from "./queries.ts";
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
 * `events.created_by` and `event_admins.user_id` carry no foreign key, so nothing clears them
 * for us. The account goes first and the rows after: a leftover grant naming an id that no
 * longer exists is inert — no session can ever carry it — whereas clearing first and then
 * failing to remove the account leaves a live admin silently stripped of every session.
 */
export async function deleteAdmin(userId: string): Promise<Result> {
  const ctx = await superadminHeaders();
  if (!ctx) return fail("Tidak diizinkan.");
  if (userId === ctx.self) return fail("Anda tidak bisa menghapus akun sendiri.");

  try {
    await auth.api.removeUser({ headers: ctx.headers, body: { userId } });
    await query(`update events set created_by = null where created_by = $1`, [userId]);
    await query(`delete from event_admins where user_id = $1`, [userId]);
    revalidatePath("/admin/pengguna");
    revalidatePath("/admin");
    return done(undefined);
  } catch (err) {
    return fail(reason(err));
  }
}

// --- grants -------------------------------------------------------------------------------
//
// Who staffs which majelis. The same relation from both ends, because both questions get asked:
// "who is running this session?" while looking at the session, and "which sessions is this
// person on?" while looking at the account. One table, two screens, no second source of truth.

/** The majelis this admin is staffing. */
export async function getAdminEvents(userId: string): Promise<Result<string[]>> {
  const ctx = await superadminHeaders();
  if (!ctx) return fail("Tidak diizinkan.");
  return done(await adminEventIds(userId));
}

/**
 * Replaces the staff list wholesale rather than adding and removing one at a time: the screen
 * shows a set of checkboxes and saves once, so the set it hands back *is* the intent. Doing it
 * in a transaction keeps a half-applied list from ever being the thing an admin is refused by.
 */
export async function setEventAdmins(eventId: string, userIds: string[]): Promise<Result> {
  const ctx = await superadminHeaders();
  if (!ctx) return fail("Tidak diizinkan.");
  return replaceGrants("event_id", eventId, "user_id", userIds, [
    "/admin",
    `/admin/events/${eventId}`,
  ]);
}

/** The same grant from the account's side. */
export async function setAdminEvents(userId: string, eventIds: string[]): Promise<Result> {
  const ctx = await superadminHeaders();
  if (!ctx) return fail("Tidak diizinkan.");
  return replaceGrants("user_id", userId, "event_id", eventIds, [
    "/admin",
    "/admin/pengguna",
    // The sessions themselves, so the pair stays symmetric with setEventAdmins.
    ...eventIds.map((id) => `/admin/events/${id}`),
  ]);
}

async function replaceGrants(
  keyCol: "event_id" | "user_id",
  key: string,
  otherCol: "event_id" | "user_id",
  others: string[],
  paths: string[],
): Promise<Result> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`delete from event_admins where ${keyCol} = $1`, [key]);
    if (others.length) {
      await client.query(
        `insert into event_admins (${keyCol}, ${otherCol})
         select $1, unnest($2::text[])`,
        [key, others],
      );
    }
    await client.query("commit");
  } catch (err) {
    // The rollback is itself a query, and a connection broken mid-transaction fails it too.
    // Postgres discards the transaction when the connection goes, so there is nothing to
    // salvage and nothing to report: the original failure is the one worth returning.
    await client.query("rollback").catch(() => {});
    // A grant naming a majelis or an account that has since been deleted is the likely cause,
    // and the screen the operator is looking at is simply stale.
    return fail(`Gagal menyimpan akses: ${err instanceof Error ? err.message : "coba muat ulang."}`);
  } finally {
    client.release();
  }
  for (const path of paths) revalidatePath(path);
  return done(undefined);
}
