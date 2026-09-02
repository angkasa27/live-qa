import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import SignOutButton from "@/components/SignOutButton";

/**
 * Every admin screen wears this: an ink bar that never moves, then the work.
 * The speaker deck is the one admin route that opts out, it takes the whole viewport.
 *
 * The bar carries the title rather than the page repeating it underneath. Two shapes:
 * the index gets the product's name and who is signed in, and every inner screen gets
 * back plus the majelis it belongs to, so the phone never shows a header taller than it
 * needs. `action` is the one thing this screen does that is not reading — "Pengaturan"
 * on the event, nothing on the list.
 *
 * Ink is painted with literal hexes on purpose; see docs/DESIGN.md § Light only.
 */
export default function AdminShell({
  back,
  title,
  subtitle,
  action,
  strip,
  footer,
  wide,
  children,
}: {
  back?: { href: string; label: string };
  title: string;
  /** Sits under the title in the bar. The index uses it for the signed-in address. */
  subtitle?: ReactNode;
  /** Right-hand control in the bar. Replaces sign-out on screens that have one. */
  action?: ReactNode;
  /** A band of context directly under the bar, still on ink. The event screen's status line. */
  strip?: ReactNode;
  /**
   * Pinned to the bottom of the viewport. A sibling of <main> rather than its last child:
   * inside the scroll `sticky bottom-0` only pins once the content overflows, so on a short
   * list the bar simply sat under the cards instead of staying under the thumb.
   */
  footer?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const width = wide ? "max-w-5xl" : "max-w-3xl";

  return (
    <>
      <header className="sticky top-0 z-20 bg-foreground text-background">
        {back ? (
          <div className={`mx-auto flex min-h-14 w-full ${width} items-center gap-2 px-2 sm:px-4`}>
            <Link
              href={back.href}
              aria-label={back.label}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#e8e5df] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8e5df]"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Link>
            <h1 className="min-w-0 flex-1 truncate font-semibold">{title}</h1>
            <div className="shrink-0">{action ?? <SignOutButton />}</div>
          </div>
        ) : (
          <div className={`mx-auto w-full ${width} px-4 pt-4 pb-3.5 sm:px-6`}>
            <div className="flex items-start gap-3">
              <h1 className="min-w-0 flex-1 font-serif text-[1.625rem] leading-tight font-medium tracking-tight">
                {title}
              </h1>
              <div className="shrink-0">{action ?? <SignOutButton />}</div>
            </div>
            {subtitle && <div className="mt-0.5 text-[0.8125rem] text-[#8b857c]">{subtitle}</div>}
          </div>
        )}
        {strip}
      </header>

      <main className={`mx-auto w-full ${width} flex-1 px-4 pt-4 ${footer ? "pb-4" : "pb-20"} sm:px-6`}>
        {children}
      </main>

      {footer && (
        <div className="sticky bottom-0 border-t border-border-soft bg-background/90 backdrop-blur">
          <div
            className={`mx-auto w-full ${width} px-4 py-3 sm:px-6 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]`}
          >
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
