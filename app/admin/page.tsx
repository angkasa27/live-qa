import { CalendarOff, Plus } from "lucide-react";
import Link from "next/link";
import AdminShell from "@/components/admin/Shell";
import LocalTime from "@/components/LocalTime";
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

type Row = Awaited<ReturnType<typeof listEventsForAdmin>>[number];

function EventCard({ e }: { e: Row }) {
  return (
    <Link
      href={`/admin/events/${e.id}`}
      className="block rounded-xl border border-border bg-card transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="p-4">
        <h3 className="text-lg font-semibold leading-snug">{e.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {e.speaker} · <LocalTime iso={e.startsAt} /> · {e.venue}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5 text-xs">
        {/* Pending first and loudest: during a live session it's the only number
            that needs anyone to do something. */}
        {e.pending > 0 && (
          <span className="rounded-full border border-warn-border bg-warn-soft px-2.5 py-1 font-semibold text-warn">
            {e.pending} menunggu review
          </span>
        )}
        {e.unanswered > 0 && (
          <span className="rounded-full bg-accent px-2.5 py-1 font-medium text-primary">
            {e.unanswered} belum dijawab
          </span>
        )}
        <span className="text-muted-foreground">{e.total} pertanyaan</span>
        {!e.acceptingQuestions && <span className="ml-auto text-muted-foreground">tertutup</span>}
      </div>
    </Link>
  );
}

export default async function AdminHome() {
  const session = await requireSession("/admin");
  const events = await listEventsForAdmin();

  return (
    <AdminShell
      title="Majelis"
      subtitle={`Masuk sebagai ${session.user.email}`}
      action={
        <Link
          href="/admin/events/new"
          className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
        >
          <Plus className="h-[18px] w-[18px]" aria-hidden />
          Buat majelis
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
        <div className="space-y-8">
          {GROUPS.map(([status, label]) => {
            const rows = events.filter((e) => e.status === status);
            if (rows.length === 0) return null;
            return (
              <section key={status}>
                <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-live" aria-hidden />}
                  {label}
                  <span className="tabular-nums font-normal">{rows.length}</span>
                </h2>
                <ul className="space-y-3">
                  {rows.map((e) => (
                    <li key={e.id}>
                      <EventCard e={e} />
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
