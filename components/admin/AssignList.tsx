"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { eventDate } from "@/lib/relativeTime";

/**
 * Which majelis a person runs, as checkboxes against their name.
 *
 * Assignment lives with the person, not with the session, because that is the question
 * anyone actually asks: "what does Rani run?" — never "who is on session 47?". The event's
 * own settings sheet used to carry the mirror image of this list, which meant two screens
 * editing one relation and no obvious home for it.
 */
export default function AssignList({
  events,
  selected,
  onChange,
  disabled,
}: {
  events: { id: string; name: string; startsAt: string; status: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  if (events.length === 0) {
    return <p className="text-base text-muted-foreground">Belum ada majelis untuk ditugaskan.</p>;
  }

  return (
    <div className="-mx-1">
      {events.map((e) => {
        const checked = selected.includes(e.id);
        return (
          <label
            key={e.id}
            className="flex min-h-13 cursor-pointer items-center gap-3 border-b border-border-soft px-1 py-2 last:border-b-0"
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(v) =>
                onChange(v ? [...selected, e.id] : selected.filter((id) => id !== e.id))
              }
            />
            <span className="min-w-0 flex-1 text-md font-semibold">
              {e.name}
              <small className="block text-2xs font-normal text-muted-foreground">
                {eventDate(e.startsAt)}
                {e.status === "live" && " · live"}
              </small>
            </span>
          </label>
        );
      })}
    </div>
  );
}
