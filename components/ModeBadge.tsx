import type { Event } from "@/lib/mock";

export default function ModeBadge({ mode }: { mode: Event["mode"] }) {
  if (mode === "recorded") {
    return (
      <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
        Recorded
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
      Live
    </span>
  );
}
