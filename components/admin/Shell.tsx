import { ChevronLeft } from "lucide-react";
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
      {/* Ink bar: the admin side of the app is a different place, and the header says so
          before anything else on the screen does. Design "Admin — pola navigasi sama". */}
      <header className="sticky top-0 z-20 bg-foreground text-background">
        <div className={`mx-auto flex min-h-14 w-full ${width} items-center gap-3 px-4 sm:px-6`}>
          {back ? (
            <Link
              href={back.href}
              className="-ml-2 flex h-12 min-w-0 items-center gap-1 rounded-lg pr-2 pl-1 text-sm font-semibold text-[#e8e5df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8e5df]"
            >
              <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
              <span className="truncate">{back.label}</span>
            </Link>
          ) : (
            <Link href="/admin" className="font-serif text-lg font-medium tracking-tight">
              Admin Sual
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
            <h1 className="font-serif text-[1.625rem] leading-tight font-medium tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <div className="mt-1.5 text-[0.9375rem] text-muted-foreground">{subtitle}</div>}
          </div>
          {action && <div className="shrink-0 sm:pt-1">{action}</div>}
        </div>
        {children}
      </main>
    </>
  );
}
