"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
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
          className="flex min-h-[2.75rem] items-center gap-[7px] rounded-full border border-border bg-surface px-3 text-[0.8125rem] font-semibold transition-colors hover:border-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${loading === "refresh" ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Muat yang baru
        </button>
      </div>

      {items.length === 0 && loading === null ? (
        <div className="rounded-2xl border border-dashed border-border px-7 py-13 text-center">
          <p className="font-serif text-[1.1875rem] leading-snug">Belum ada pertanyaan.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">
            {canAsk
              ? "Majelis baru dimulai. Pertanyaan pertama boleh dari Anda."
              : "Belum ada pertanyaan pada majelis ini."}
          </p>
          {canAsk && (
            <Link
              href={`/events/${eventId}/tanya`}
              className="mt-3 inline-block text-sm font-semibold text-accent underline underline-offset-4"
            >
              Kirim pertanyaan →
            </Link>
          )}
        </div>
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
          className="mt-3 min-h-[3rem] w-full rounded-[14px] border border-border bg-surface text-sm font-semibold transition-colors hover:border-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {loading === "more" ? "Memuat…" : "Muat pertanyaan lagi"}
        </button>
      )}
    </>
  );
}
