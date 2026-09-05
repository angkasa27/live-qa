import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

import { Separator } from "@/components/ui/separator"

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn(
        "group/item-group flex w-full flex-col gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2",
        className
      )}
      {...props}
    />
  )
}

function ItemSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn("my-2", className)}
      {...props}
    />
  )
}

/**
 * The design's `.row`, `.person` and `.opt`, which are one shape doing three jobs.
 *
 * `row` is the default and is deliberately NOT a card: no radius, no side borders, a
 * hairline on top and the full width of the column. That is the whole point — content is
 * flat, so the rounded things on the page are the ones you can touch. The entire row is
 * the tap target, which is why `:active` tints the whole band.
 *
 * `boxed` is the exception the designs allow: a bordered, rounded row that is itself a
 * control, used for the "Layar pemateri" / "Bagikan tautan" options.
 */
const itemVariants = cva(
  "group/item flex w-full flex-wrap items-center text-left outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        row: "border-t border-border-soft [a]:active:bg-background [button]:active:bg-background",
        boxed:
          "rounded-md border border-border bg-card [a]:active:bg-background [button]:active:bg-background",
        plain: "",
      },
      size: {
        default: "gap-3.5 px-5 py-4",
        sm: "gap-3 px-5 py-3.5",
      },
    },
    defaultVariants: {
      variant: "row",
      size: "default",
    },
  }
)

function Item({
  className,
  variant = "row",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof itemVariants>) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(itemVariants({ variant, size, className })),
      },
      props
    ),
    render,
    state: {
      slot: "item",
      variant,
      size,
    },
  })
}

const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "[&_svg:not([class*='size-'])]:size-4 [&_svg]:stroke-faint",
        // 96px at 16:9 — a session poster, cropped the way the cover is everywhere else.
        image:
          "w-24 overflow-hidden rounded-sm bg-border [&_img]:aspect-video [&_img]:size-full [&_img]:object-cover",
        // A round initial, for the people list.
        avatar: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1.5",
        className
      )}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn(
        "flex w-fit items-center gap-2 text-xl leading-snug font-bold tracking-[-0.02em]",
        className
      )}
      {...props}
    />
  )
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="item-description"
      className={cn(
        "text-left text-sm leading-normal font-normal text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-actions"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  )
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-header"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-footer"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
}
