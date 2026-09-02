import type { EventStatus } from "@/lib/types";

/** Where the session is in its life. Says nothing about whether it has video; see ROADMAP §2. */
export default function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "live") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-live px-2.5 py-[5px] text-[0.6875rem] font-bold tracking-wide text-white uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
        Berlangsung
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide text-muted uppercase">
      {status === "scheduled" ? "Akan datang" : "Arsip"}
    </span>
  );
}
