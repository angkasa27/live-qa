import { ChevronRight, CircleSlash, Info, Presentation, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";

import PageShell from "@/components/PageShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { Toolbar, ToolbarBack, ToolbarTitle } from "@/components/ui/toolbar";
import { getAdminEvents, listAdmins } from "@/lib/admins";
import { requireSuperadmin } from "@/lib/guard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Superadmin only. requireSuperadmin 404s an ordinary admin who guesses the address. */
export default async function PeoplePage() {
  await requireSuperadmin("/admin/people");
  const admins = await listAdmins();
  const rows = admins.ok ? admins.data : [];

  /**
   * How many majelis each person runs. A handful of accounts read once by one person, so a
   * query each is cheaper than the join that would avoid them — and it is the number the
   * superadmin actually scans this list for.
   */
  const counts = Object.fromEntries(
    await Promise.all(
      rows.map(async (a) => {
        const res = await getAdminEvents(a.id);
        return [a.id, res.ok ? res.data.length : 0] as const;
      })
    )
  );

  return (
    <>
      <Toolbar variant="ink">
        <ToolbarBack href="/admin">{""}</ToolbarBack>
        <ToolbarTitle>Orang</ToolbarTitle>
      </Toolbar>

      <PageShell
        padded={false}
        action={
          <Button variant="outline" size="lg" render={<Link href="/admin/people/invite" />}>
            <UserPlus aria-hidden />
            Undang admin
          </Button>
        }
      >
        {!admins.ok ? (
          <Alert variant="destructive" className="m-4">
            <AlertDescription>{admins.error}</AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="mx-4 mt-4">
              <Info aria-hidden />
              <AlertDescription>
                Admin hanya melihat sesi yang ditugaskan kepadanya.
              </AlertDescription>
            </Alert>

            {rows.map((a) => {
              const superadmin = a.role === "superadmin";
              // A superadmin is on every majelis already; there is nothing to assign and
              // nothing to revoke, so the row states what they are and stops there.
              const body = (
                <>
                  <Avatar className={cn(a.banned && "opacity-55")}>
                    <AvatarFallback>{a.name.trim().charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <ItemContent className={cn("gap-0.5", a.banned && "opacity-55")}>
                    <ItemTitle className="block truncate text-md">{a.name}</ItemTitle>
                    <ItemDescription className="truncate text-xs">{a.email}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    {superadmin ? (
                      <Badge variant="accent">
                        <ShieldCheck aria-hidden />
                        Superadmin
                      </Badge>
                    ) : a.banned ? (
                      <Badge variant="muted">
                        <CircleSlash aria-hidden />
                        Nonaktif
                      </Badge>
                    ) : (
                      <Badge variant="muted">
                        <Presentation aria-hidden />
                        {counts[a.id] ?? 0}
                      </Badge>
                    )}
                    {!superadmin && (
                      <ChevronRight className="size-4.5 shrink-0 stroke-faint stroke-[2.2]" aria-hidden />
                    )}
                  </ItemActions>
                </>
              );

              return superadmin ? (
                <Item key={a.id} size="sm">
                  {body}
                </Item>
              ) : (
                <Item key={a.id} size="sm" render={<Link href={`/admin/people/${a.id}`} />}>
                  {body}
                </Item>
              );
            })}
          </>
        )}
      </PageShell>
    </>
  );
}
