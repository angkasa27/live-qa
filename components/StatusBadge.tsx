import { Archive, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EventStatus } from "@/lib/types";

/** Where the session is in its life. Says nothing about whether it has video; see ROADMAP §2. */
export default function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "live") {
    return (
      <Badge variant="live" className="shrink-0 gap-1.5 px-2.5 text-[0.6875rem]">
        <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
        Berlangsung
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0 gap-1 px-2.5 text-[0.6875rem]">
      {status === "scheduled" ? (
        <CalendarClock className="h-3 w-3" aria-hidden />
      ) : (
        <Archive className="h-3 w-3" aria-hidden />
      )}
      {status === "scheduled" ? "Akan datang" : "Arsip"}
    </Badge>
  );
}
