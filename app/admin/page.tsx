import { CalendarOff, Plus } from "lucide-react";
import Link from "next/link";
import AdminShell from "@/components/admin/Shell";
import { EventRowCard, LiveEventCard } from "@/components/admin/EventCards";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { listEventsForAdmin } from "@/lib/queries";
import { requireSession } from "@/lib/guard";
import type { EventStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// The query already sorts live first; grouping just puts a name on the order that is there.
const GROUPS = [
  ["live", "Berlangsung"],
  ["scheduled", "Akan datang"],
  ["archived", "Arsip"],
] as const satisfies readonly (readonly [EventStatus, string])[];

export default async function AdminHome() {
  const session = await requireSession("/admin");
  const events = await listEventsForAdmin();

  return (
    <AdminShell
      title="Admin Sual"
      subtitle={session.user.email}
      /* Under the thumb rather than beside the way out: making a session is the one thing
         this screen does that is not reading. */
      footer={
        <Link
          href="/admin/events/new"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="h-[18px] w-[18px]" aria-hidden />
          Sesi baru
        </Link>
      }
    >
      {events.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <CalendarOff aria-hidden />
          </EmptyMedia>
          <EmptyDescription>Belum ada majelis.</EmptyDescription>
        </Empty>
      ) : (
        <div className="space-y-6">
          {GROUPS.map(([status, label]) => {
            const rows = events.filter((e) => e.status === status);
            if (rows.length === 0) return null;
            return (
              <section key={status}>
                <h2 className="mb-2 flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.12em] text-faint uppercase">
                  {status === "live" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
                  )}
                  {label}
                </h2>
                <ul className="space-y-2.5">
                  {rows.map((e) => (
                    <li key={e.id}>
                      {/* Live gets the full card; everything else is a row, because during a
                          session the running majelis is the only one anyone opens. */}
                      {status === "live" ? <LiveEventCard e={e} /> : <EventRowCard e={e} />}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

    </AdminShell>
  );
}
