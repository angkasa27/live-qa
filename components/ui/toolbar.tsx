import { ChevronLeftIcon } from "lucide-react"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * One bar, every inner page, detail and form alike — and the single place the two sides of
 * the product look different on purpose.
 *
 * `paper` is the jamaah's: white, a hairline under it, a green back link that names where
 * it goes ("Majelis", "Batal") rather than relying on an arrow alone.
 *
 * `ink` is the admin's, and it is ink so an operator mid-majelis is never unsure which
 * side they are typing into. Its colours are --on-bar / --on-bar-2 over --foreground; they
 * used to be literal hexes copied between files.
 *
 * Sticky in both skins: on a long queue the session's state has to stay on screen, which
 * is the whole reason it is stated here and not in the body.
 */
const toolbarVariants = cva(
  "sticky top-0 z-20 flex min-h-14 items-center gap-1 px-2",
  {
    variants: {
      variant: {
        paper: "border-b border-border-soft bg-card",
        ink: "bg-foreground text-on-bar",
      },
    },
    defaultVariants: { variant: "paper" },
  }
)

function Toolbar({
  className,
  variant = "paper",
  ...props
}: React.ComponentProps<"header"> & VariantProps<typeof toolbarVariants>) {
  return (
    <header
      data-slot="toolbar"
      data-variant={variant}
      className={cn(toolbarVariants({ variant, className }))}
      {...props}
    />
  )
}

/**
 * The way back. Takes a label because "back to what" is worth a word — on the ask screen
 * it reads "Batal", which is the same gesture meaning something different.
 */
function ToolbarBack({
  href,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      data-slot="toolbar-back"
      className={cn(
        "flex min-h-12 shrink-0 items-center gap-1 rounded-full py-0 pr-3.5 pl-2 text-md font-bold outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "in-data-[variant=paper]:text-primary in-data-[variant=paper]:active:bg-accent",
        "in-data-[variant=ink]:text-on-bar in-data-[variant=ink]:active:bg-white/12",
        className
      )}
      {...props}
    >
      <ChevronLeftIcon className="size-4.5 stroke-[2.4]" aria-hidden />
      {children}
    </Link>
  )
}

/** Truncates rather than wraps: a two-line bar shifts everything under it. */
function ToolbarTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="toolbar-title"
      className={cn(
        "min-w-0 flex-1 truncate px-2 text-xl font-bold",
        className
      )}
      {...props}
    />
  )
}

/** Pushes what follows to the right when there is no title to do it. */
function ToolbarSpacer() {
  return <span data-slot="toolbar-spacer" className="flex-1" aria-hidden />
}

export { Toolbar, ToolbarBack, ToolbarTitle, ToolbarSpacer, toolbarVariants }
