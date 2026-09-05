import { BookOpen, MessageCircle } from "lucide-react";
import Link from "next/link";

/**
 * The only way between the two home screens. Inner pages and sheets deliberately don't show
 * it, so it takes the current tab as a prop rather than reading the pathname — a page that
 * can't say which tab it is shouldn't have one.
 */
const TABS = [
  { href: "/", label: "Majelis", Icon: BookOpen },
  { href: "/pertanyaan-saya", label: "Pertanyaan saya", Icon: MessageCircle },
] as const;

export default function BottomTabs({ current }: { current: "/" | "/pertanyaan-saya" }) {
  return (
    <nav className="sticky bottom-0 border-t border-border-soft bg-card [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="page grid grid-cols-2 gap-1 px-2 py-1.5">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === current;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md text-2xs focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring ${
                active ? "bg-accent font-bold text-primary" : "font-semibold text-faint"
              }`}
            >
              <Icon className="size-4.5" strokeWidth={1.9} aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
