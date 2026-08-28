import Link from "next/link";
import type { ReactNode } from "react";
import SignOutButton from "@/components/SignOutButton";

/**
 * Every admin screen wears this: a nav bar that never moves, then a page header, then the work.
 * The speaker deck is the one admin route that opts out, it takes the whole viewport.
 */
export default function AdminShell({
  back,
  title,
  subtitle,
  action,
  wide,
  children,
}: {
  back?: { href: string; label: string };
  title: string;
  subtitle?: ReactNode;
  /** Primary action for the screen. Full width on a phone, beside the title from sm up. */
  action?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const width = wide ? "max-w-5xl" : "max-w-3xl";

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className={`mx-auto flex h-14 w-full ${width} items-center gap-3 px-4 sm:px-6`}>
          {back ? (
            <Link
              href={back.href}
              className="-ml-2 flex h-11 min-w-0 items-center gap-1 rounded-lg pl-1 pr-2 text-sm font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="truncate">{back.label}</span>
            </Link>
          ) : (
            <Link href="/admin" className="text-[0.9375rem] font-semibold tracking-tight">
              Sual <span className="font-normal text-muted">admin</span>
            </Link>
          )}
          <div className="ml-auto shrink-0">
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className={`mx-auto w-full ${width} flex-1 px-4 pb-20 pt-6 sm:px-6`}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <div className="mt-1.5 text-[0.9375rem] text-muted">{subtitle}</div>}
          </div>
          {action && <div className="shrink-0 sm:pt-1">{action}</div>}
        </div>
        {children}
      </main>
    </>
  );
}
