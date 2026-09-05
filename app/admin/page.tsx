import { CalendarDays, CalendarOff, Check, Clock, MapPin, Pencil, Plus, User, Users } from "lucide-react";
import Link from "next/link";

import LocalTime from "@/components/LocalTime";
import PageShell from "@/components/PageShell";
import SignOutButton from "@/components/SignOutButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/components/ui/item";
import { MetaItem, MetaList } from "@/components/MetaList";
import { Toolbar, ToolbarTitle } from "@/components/ui/toolbar";
import { isSuperadmin } from "@/lib/auth";
import { requireSession, scopeOf } from "@/lib/guard";
import { listEventsForAdmin } from "@/lib/queries";
import { daysUntil } from "@/lib/relativeTime";
import type { EventStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// The query already sorts live first; grouping just puts a name on the order that is there.
const GROUPS = [
  ["live", "Berlangsung"],
  ["scheduled", "Akan datang"],
  ["archived", "Arsip"],
] as const satisfies readonly (readonly [EventStatus, string])[];

type Row = Awaited<ReturnType<typeof listEventsForAdmin>>[number];

/**
 * The one thing this row wants from you, as a single tag. Ranked, because a row gets one:
 * a running session outranks a queue, and a queue outranks a date. Anything with nothing
 * outstanding says so quietly rather than saying nothing, so a scanned list has no gaps.
 */
function StateTag({ e }: { e: Row }) {
  if (e.status === "live") {
    return (
      <Badge variant="live">
        <span className="size-2 rounded-full bg-current motion-safe:animate-pulse" aria-hidden />
        Live
      </Badge>
    );
  }
  // Two kinds of outstanding work, and they are not the same job: `pending` needs a
  // decision, `unanswered` needs writing. Either one means this session is not finished,
  // so "Selesai" has to wait for both to be zero — an archived majelis with seven
  // unanswered questions calling itself done is how they stay unanswered.
  if (e.pending > 0 || e.unanswered > 0) {
    return (
      <Badge variant={e.pending > 0 ? "warning" : "accent"}>
        <Pencil aria-hidden />
        {e.pending > 0 ? e.pending : e.unanswered}
      </Badge>
    );
  }
  if (e.status === "scheduled") {
    const days = daysUntil(e.startsAt);
    return (
      <Badge variant="muted">
        <CalendarDays aria-hidden />
        {days <= 0 ? "hari ini" : `${days} hari`}
      </Badge>
    );
  }
  return (
    <Badge variant="muted">
      <Check aria-hidden />
      Selesai
    </Badge>
  );
}

export default async function AdminHome() {
  const session = await requireSession("/admin");
  // An admin sees the majelis they are staffing and nothing else; scopeOf gives the superadmin
  // null, which the query reads as "no filter".
  const events = await listEventsForAdmin(scopeOf(session.user));
  const superadmin = isSuperadmin(session.user);

  return (
    <>
      <Toolbar variant="ink">
        <ToolbarTitle>Sesi Anda</ToolbarTitle>
        {superadmin && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Orang"
            className="text-on-bar active:bg-white/12"
            render={<Link href="/admin/pengguna" />}
          >
            <Users aria-hidden />
          </Button>
        )}
        <SignOutButton />
      </Toolbar>

      <PageShell
        padded={false}
        /* Under the thumb rather than beside the way out: making a session is the one thing
           this screen does that is not reading — and it is the superadmin's. An admin is
           handed sessions to run; they do not start them. */
        action={
          superadmin ? (
            <Button variant="outline" size="lg" render={<Link href="/admin/events/new" />}>
              <Plus aria-hidden />
              Sesi baru
            </Button>
          ) : undefined
        }
      >
        {events.length === 0 ? (
          <Empty className="m-4">
            <EmptyMedia variant="icon">
              <CalendarOff aria-hidden />
            </EmptyMedia>
            <EmptyDescription>
              {superadmin
                ? "Belum ada majelis."
                : "Belum ada majelis yang ditugaskan kepada Anda."}
            </EmptyDescription>
          </Empty>
        ) : (
          GROUPS.map(([status, label]) => {
            const rows = events.filter((e) => e.status === status);
            if (rows.length === 0) return null;
            return (
              <section key={status}>
                <p className="px-5 pt-4 pb-2 text-base font-bold text-muted-foreground">{label}</p>
                {rows.map((e) => (
                  <Item key={e.id} render={<Link href={`/admin/events/${e.id}`} />} size="sm">
                    <ItemContent>
                      <ItemTitle className="block">{e.name}</ItemTitle>
                      <MetaList layout="inline">
                        {e.status === "archived" ? (
                          <MetaItem icon={User}>{e.speaker}</MetaItem>
                        ) : (
                          <MetaItem icon={MapPin}>{e.venue}</MetaItem>
                        )}
                        <MetaItem icon={Clock}>
                          <LocalTime iso={e.startsAt} />
                        </MetaItem>
                        {/* Only when it is not already the tag on the right. */}
                        {e.status === "live" && e.pending > 0 && (
                          <MetaItem icon={Pencil} className="font-bold text-warn [&_svg]:stroke-current">
                            {e.pending} perlu review
                          </MetaItem>
                        )}
                      </MetaList>
                    </ItemContent>
                    <ItemActions>
                      <StateTag e={e} />
                    </ItemActions>
                  </Item>
                ))}
              </section>
            );
          })
        )}
      </PageShell>
    </>
  );
}
