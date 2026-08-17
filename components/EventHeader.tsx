import Link from "next/link";
import type { ReactNode } from "react";

export default function EventHeader({
  name,
  backHref,
  backLabel = "Back",
  action,
}: {
  name: string;
  backHref: string;
  backLabel?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold sm:text-base">{name}</h1>
        {action}
      </div>
    </header>
  );
}
