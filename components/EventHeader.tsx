import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The inner-page header from the design: a 56px bar holding a 48px back target, the title on one
 * clipped line, and at most one action on the right. `dark` is the admin treatment — same bar,
 * ink background, so an admin can tell at a glance which side of the app they are on.
 */
export default function EventHeader({
  name,
  backHref,
  backLabel = "Kembali",
  action,
  dark = false,
}: {
  name: string;
  backHref: string;
  backLabel?: string;
  action?: ReactNode;
  dark?: boolean;
}) {
  return (
    <header
      className={`sticky top-0 z-10 border-b ${
        dark ? "border-[#35302a] bg-foreground text-background" : "border-border-soft bg-card"
      }`}
    >
      <div className="mx-auto flex min-h-14 w-full max-w-3xl items-center gap-1 py-1 pr-3 pl-1 sm:px-4">
        <Link
          href={backHref}
          aria-label={backLabel}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            dark ? "text-[#e8e5df]" : "text-foreground hover:bg-background"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="min-w-0 flex-1 truncate font-bold">{name}</h1>
        {action}
      </div>
    </header>
  );
}
