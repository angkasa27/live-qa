import { cn } from "@/lib/utils"

/**
 * The body of a screen and, optionally, the one thing it does.
 *
 * Lifted out of the old admin Shell so both sides of the product share it: a jamaah
 * screen and an admin screen are the same reading of the same questions, and an earlier
 * 64rem admin variant only meant the two drifted apart on a tablet. The bar above it is
 * <Toolbar>; this is everything below.
 *
 * `action` is a sibling of <main>, not its last child. That is load-bearing: inside the
 * scroll container `sticky bottom-0` only pins once the content overflows, so on a short
 * list the submit bar simply sat under the content instead of staying under the thumb.
 *
 * Horizontal padding stays with the caller. A bar and a list of rows do not gutter the
 * same, and rows are full-bleed by design — passing `padded={false}` is how a screen made
 * of <Item> rows opts out.
 */
export default function PageShell({
  action,
  padded = true,
  className,
  children,
}: {
  /** Pinned to the bottom of the viewport, over a blur. The screen's single call to action. */
  action?: React.ReactNode;
  padded?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <main
        className={cn(
          "page flex-1",
          padded && "px-5 py-4",
          !action && "pb-20",
          className
        )}
      >
        {children}
      </main>

      {action && (
        <div className="sticky bottom-0 border-t border-border-soft bg-card/95 backdrop-blur-md">
          <div className="page px-5 py-3 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
            {action}
          </div>
        </div>
      )}
    </>
  )
}
