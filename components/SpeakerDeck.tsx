"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchApproved } from "@/lib/actions";
import { timecode, type Question } from "@/lib/types";

/**
 * The projector screen keeps its own palette and its own type scale, and neither comes from
 * the design files — they describe phones. A hall reads this from ten metres in a room whose
 * lights are usually still on, so the ground is darker than the admin bar (#141311, not
 * --foreground) and every size is a clamp against the viewport rather than a step on the
 * product's ramp. --bar-line and --on-bar-2 are shared with the admin bar, because those two
 * really are the same greys.
 */

/** Body length → font size. Long questions shrink so they still fit one screen. */
function bodyClass(len: number) {
  if (len > 260) return "text-[clamp(1.05rem,3.6vw,1.9rem)]";
  if (len > 120) return "text-[clamp(1.35rem,5vw,2.6rem)]";
  return "text-[clamp(1.75rem,7vw,3.75rem)]";
}

export default function SpeakerDeck({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<Question[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  // Refs, not state: loadMore can be called again before a re-render lands, and it must see
  // the cursor the previous fetch produced rather than the one from its closure.
  const loading = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const applyCursor = useCallback((c: string | null) => {
    cursorRef.current = c;
    setCursor(c);
  }, []);

  const loadMore = useCallback(async () => {
    if (loading.current || !cursorRef.current) return;
    loading.current = true;
    try {
      const page = await fetchApproved(eventId, cursorRef.current);
      setItems((prev) => [...prev, ...page.items]);
      applyCursor(page.nextCursor);
    } finally {
      loading.current = false;
    }
  }, [eventId, applyCursor]);

  useEffect(() => {
    let live = true;
    fetchApproved(eventId, null).then((page) => {
      if (!live) return;
      setItems(page.items);
      applyCursor(page.nextCursor);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [eventId, applyCursor]);

  // The syaikh is on stage and cannot be asked to pull-to-refresh. This is one of the two or
  // three devices per event that poll; the audience keeps a manual Refresh button, which is what
  // keeps 5000 phones off the server entirely. See ROADMAP.md §3.
  useEffect(() => {
    const id = setInterval(async () => {
      if (loading.current) return;
      const first = await fetchApproved(eventId, null);
      setItems((prev) => {
        const known = new Set(prev.map((q) => q.id));
        const fresh = first.items.filter((q) => !known.has(q.id));
        if (!fresh.length) return prev;
        // Only page one is re-read, so anything new is merged into what we already hold and the
        // deck re-sorts by created_at, the order the syaikh works through them.
        return [...prev, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
    }, 4000);
    return () => clearInterval(id);
  }, [eventId]);

  // Extend once the speaker is within 3 cards of the end, so the next batch is already there
  // when they swipe onto it. Driven by scroll position rather than an IntersectionObserver on
  // a sentinel card: a fast fling or a jump straight to the end skips right past a sentinel
  // without ever intersecting it, which strands the deck short of the real last question.
  useEffect(() => {
    if (items.length > 0 && current >= items.length - 3) loadMore();
  }, [current, items.length, loadMore]);

  const go = useCallback((delta: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: delta * el.clientWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    setCurrent(Math.round(el.scrollLeft / el.clientWidth));
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#141311] text-[#8b8377]" role="status">
        Memuat…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#141311] px-6 text-center text-[#f7f4ed]">
        <p className="text-2xl font-medium">Belum ada pertanyaan.</p>
        <Link href={`/admin/events/${eventId}`} className="text-on-bar-2 underline underline-offset-4">
          Kembali ke sesi
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-[#141311] text-[#f7f4ed] [overscroll-behavior:contain]">
      <div
        ref={scroller}
        onScroll={onScroll}
        tabIndex={0}
        aria-label="Daftar pertanyaan: geser atau gunakan tombol panah"
        className="flex h-dvh snap-x snap-mandatory overflow-x-auto overflow-y-hidden outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((q) => (
          <section
            key={q.id}
            className="flex h-dvh w-dvw shrink-0 snap-center flex-col justify-center px-[max(1.5rem,env(safe-area-inset-left))] py-20"
          >
            <div className="mx-auto flex w-full max-w-5xl flex-col">
              <p className={`${bodyClass(q.body.length)} leading-tight tracking-tight text-pretty`}>
                {q.body}
              </p>
              <p className="mt-6 text-[clamp(0.9rem,2vw,1.35rem)] text-on-bar-2">
                {q.author ?? "Tanpa nama"}
              </p>
              {q.answer && (
                <div className="mt-8 border-l-4 border-[#8fbfae] pl-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#8fbfae]">
                    Dijawab
                    {q.videoStart != null && (
                      <span className="tabular-nums text-[#8b8377]">{timecode(q.videoStart)}</span>
                    )}
                  </p>
                  <p className="mt-1.5 text-[clamp(0.95rem,2.2vw,1.5rem)] leading-snug text-[#d6d0c6]">
                    {q.answer}
                  </p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link
          href={`/admin/events/${eventId}`}
          className="pointer-events-auto flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-[#8b8377] transition-colors hover:text-on-bar"
        >
          <X className="h-4 w-4" aria-hidden />
          Keluar
        </Link>
        <span className="text-sm tabular-nums text-[#8b8377]">
          {Math.min(current + 1, items.length)} / {items.length}
          {cursor ? "+" : ""}
        </span>
      </div>

      {/* Pointer-based devices get buttons; on touch the swipe is the gesture. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden items-center justify-center gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] [@media(pointer:fine)]:flex">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => go(-1)}
          disabled={current === 0}
          className="pointer-events-auto border border-bar-line text-on-bar-2 active:bg-white/10 disabled:opacity-30"
          aria-label="Pertanyaan sebelumnya"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => go(1)}
          disabled={current >= items.length - 1 && !cursor}
          className="pointer-events-auto border border-bar-line text-on-bar-2 active:bg-white/10 disabled:opacity-30"
          aria-label="Pertanyaan berikutnya"
        >
          <ChevronRight className="size-6" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
