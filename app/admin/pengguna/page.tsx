import AdminShell from "@/components/admin/Shell";
import AdminUsers from "@/components/admin/AdminUsers";
import { listAdmins } from "@/lib/admins";
import { requireSuperadmin } from "@/lib/guard";

export const dynamic = "force-dynamic";

/** Superadmin only. requireSuperadmin 404s an ordinary admin who guesses the address. */
export default async function AdminUsersPage() {
  const session = await requireSuperadmin("/admin/pengguna");
  const admins = await listAdmins();

  return (
    <AdminShell back={{ href: "/admin", label: "Semua majelis" }} title="Pengguna">
      {admins.ok ? (
        <AdminUsers admins={admins.data} self={session.user.id} />
      ) : (
        <p className="text-sm text-destructive">{admins.error}</p>
      )}
    </AdminShell>
  );
}
