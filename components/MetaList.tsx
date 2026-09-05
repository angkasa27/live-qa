import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The icon-led facts under a title: who is speaking, where, when. It appears on every
 * screen in both design files, which is why it is a component and not a pattern people
 * retype.
 *
 * The pictogram carries what a label used to say — there is no "Pemateri:" prefix, because
 * a person icon in front of a person's name does not need one. That only works if the
 * icons stay consistent, so use the same one for the same fact everywhere: User for the
 * speaker, MapPin for the venue, Clock for the time, MessageCircle for question counts.
 *
 * `inline` is the admin's session list, where two or three short facts read better on one
 * wrapping line than stacked. `onImage` is the running-session hero, where this sits on a
 * cover under a veil and the strokes have to lift off the photograph.
 */
function MetaList({
  layout = "stack",
  className,
  ...props
}: React.ComponentProps<"ul"> & { layout?: "stack" | "inline" }) {
  return (
    <ul
      data-slot="meta-list"
      data-layout={layout}
      className={cn(
        "list-none",
        layout === "stack" ? "flex flex-col gap-2.5" : "flex flex-wrap gap-x-3.5 gap-y-1",
        className
      )}
      {...props}
    />
  )
}

function MetaItem({
  icon: Icon,
  className,
  children,
  ...props
}: React.ComponentProps<"li"> & { icon: LucideIcon }) {
  return (
    <li
      data-slot="meta-item"
      className={cn(
        "flex min-w-0 items-start gap-2.5 text-base leading-snug",
        "in-data-[layout=inline]:items-center in-data-[layout=inline]:gap-1.5 in-data-[layout=inline]:text-sm",
        className
      )}
      {...props}
    >
      <Icon
        aria-hidden
        strokeWidth={1.9}
        className="mt-px size-4 shrink-0 stroke-faint in-data-[layout=inline]:mt-0 in-data-[layout=inline]:size-3.5"
      />
      <span className="min-w-0">{children}</span>
    </li>
  )
}

export { MetaList, MetaItem }
