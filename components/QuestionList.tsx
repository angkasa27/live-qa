"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronDown, MessageCircleDashed, RefreshCw } from "lucide-react";
import { ASK_OPEN, ASK_SENT } from "@/components/AskDrawer";
import QuestionCard from "@/components/QuestionCard";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { relativeTime } from "@/lib/relativeTime";
import { fetchPage } from "@/lib/actions";
import type { Question } from "@/lib/types";

export default function QuestionList({
  eventId,
  youtubeId,
  canAsk = false,
}: {
  eventId: string;
  youtubeId?: string;
  /** Live events point an empty list at the form; a recorded archive has nowhere to send you. */
  canAsk?: boolean;
}) {
  const [items, setItems] = useState<Question[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<"refresh" | "more" | null>("refresh");
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  const applyFirstPage = useCallback((page: { items: Question[]; nextCursor: string | null }) => {
    setItems(page.items);
    setCursor(page.nextCursor);
    setSyncedAt(new Date().toISOString());
    setLoading(null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading("refresh");
    applyFirstPage(await fetchPage(eventId, null));
  }, [eventId, applyFirstPage]);

  useEffect(() => {
    const onSent = () => void refresh();
    window.addEventListener(ASK_SENT, onSent);
    return () => window.removeEventListener(ASK_SENT, onSent);
  }, [refresh]);

  // First load: no setState before the await, so nothing renders twice on mount.
  useEffect(() => {
    let live = true;
    fetchPage(eventId, null).then((page) => live && applyFirstPage(page));
    return () => {
      live = false;
    };
  }, [eventId, applyFirstPage]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading("more");
    const page = await fetchPage(eventId, cursor);
    setItems((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
    setLoading(null);
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-faint uppercase" aria-live="polite">
          {loading === "refresh"
            ? "Memuat…"
            : syncedAt
              ? `Diperbarui ${relativeTime(syncedAt)}`
              : "Terlama dulu"}
        </p>
        <button
          onClick={refresh}
          disabled={loading !== null}
          className="flex min-h-[2.75rem] items-center gap-[7px] rounded-full border border-border bg-card px-3 text-[0.8125rem] font-semibold transition-colors hover:border-primary disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <RefreshCw className={`h-4 w-4 ${loading === "refresh" ? "animate-spin" : ""}`} aria-hidden />
          Muat yang baru
        </button>
      </div>

      {items.length === 0 && loading === null ? (
        <Empty className="rounded-2xl px-7 py-13">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-accent text-accent-foreground">
              <MessageCircleDashed aria-hidden />
            </EmptyMedia>
            <EmptyTitle className="font-serif text-[1.1875rem] leading-snug font-normal">
              Belum ada pertanyaan.
            </EmptyTitle>
            <EmptyDescription>
              {canAsk
                ? "Majelis baru dimulai. Pertanyaan pertama boleh dari Anda."
                : "Belum ada pertanyaan pada majelis ini."}
            </EmptyDescription>
          </EmptyHeader>
          {canAsk && (
            <EmptyContent>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent(ASK_OPEN))}
                className="min-h-9 text-sm font-semibold text-primary underline underline-offset-4"
              >
                Kirim pertanyaan
                <ArrowRight className="ml-1 inline h-4 w-4 align-[-2px]" aria-hidden />
              </button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <li key={q.id}>
              <QuestionCard q={q} youtubeId={youtubeId} />
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <button
          onClick={loadMore}
          disabled={loading !== null}
          className="mt-3 flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-[14px] border border-border bg-card text-sm font-semibold transition-colors hover:border-primary disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {loading === "more" ? (
            "Memuat…"
          ) : (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden />
              Muat pertanyaan lagi
            </>
          )}
        </button>
      )}
    </>
  );
}
