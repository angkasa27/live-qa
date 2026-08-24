import type { EventStatus } from "@/lib/types";

/** Where the session is in its life. Says nothing about whether it has video — see ROADMAP §2. */
export default function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "live") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
        Berlangsung
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
      {status === "scheduled" ? "Akan datang" : "Arsip"}
    </span>
  );
}
