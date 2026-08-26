import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import StatusBadge from "@/components/StatusBadge";
import { listEventsForAdmin } from "@/lib/queries";
import { requireSession } from "@/lib/guard";
import LocalTime from "@/components/LocalTime";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await requireSession("/admin");
  const events = await listEventsForAdmin();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Kelola majelis</h1>
          <p className="mt-1.5 text-[0.9375rem] text-muted">Masuk sebagai {session.user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <Link
        href="/admin/events/new"
        className="mb-5 flex min-h-[3rem] w-full items-center justify-center rounded-xl bg-accent font-semibold text-accent-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Buat majelis baru
      </Link>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted">
          Belum ada majelis.
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                href={`/admin/events/${e.id}`}
                className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold leading-snug">{e.name}</h2>
                  <StatusBadge status={e.status} />
                </div>
                <p className="mt-1.5 text-sm text-muted">
                  {e.speaker} · <LocalTime iso={e.startsAt} /> · {e.venue}
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {/* Pending first and loudest: during a live session it's the only number
                      that needs anyone to do something. */}
                  {e.pending > 0 && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-600">
                      {e.pending} menunggu review
                    </span>
                  )}
                  {e.unanswered > 0 && (
                    <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">
                      {e.unanswered} belum dijawab
                    </span>
                  )}
                  <span className="rounded-full border border-border px-2.5 py-1 text-muted">
                    {e.total} pertanyaan
                  </span>
                  {!e.acceptingQuestions && (
                    <span className="rounded-full border border-border px-2.5 py-1 text-muted">
                      tertutup
                    </span>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
