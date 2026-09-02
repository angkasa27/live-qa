import { BookOpen, MessageCircleQuestionMark } from "lucide-react";
import Link from "next/link";

/**
 * The only way between the two home screens. Inner pages and sheets deliberately don't show it
 * (see the navigation rules on the design canvas), so it takes the current tab as a prop rather
 * than reading the pathname — a page that can't say which tab it is shouldn't have one.
 */
const TABS = [
  { href: "/", label: "Majelis", Icon: BookOpen },
  { href: "/pertanyaan-saya", label: "Pertanyaan saya", Icon: MessageCircleQuestionMark },
] as const;

export default function BottomTabs({ current }: { current: "/" | "/pertanyaan-saya" }) {
  return (
    <nav className="sticky bottom-0 grid grid-cols-2 border-t border-border-soft bg-muted [padding-bottom:env(safe-area-inset-bottom)]">
      {TABS.map(({ href, label, Icon }) => {
        const active = href === current;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-[3px] text-[0.8125rem] first:border-r first:border-border-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
              active ? "font-bold text-primary" : "font-medium text-muted-foreground"
            }`}
          >
            <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
            {label}
            {active && <span className="h-0.5 w-[18px] rounded-full bg-primary" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}
