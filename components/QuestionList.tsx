"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import { relativeTime } from "@/lib/relativeTime";
import type { Question } from "@/lib/mock";
import { useQa } from "@/lib/store";

export default function QuestionList({ eventId }: { eventId: string }) {
  const { fetchPage } = useQa();
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
  }, [eventId, fetchPage, applyFirstPage]);

  // First load: no setState before the await, so nothing renders twice on mount.
  useEffect(() => {
    let live = true;
    fetchPage(eventId, null).then((page) => live && applyFirstPage(page));
    return () => {
      live = false;
    };
  }, [eventId, fetchPage, applyFirstPage]);

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
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {loading === "refresh" ? "Refreshing…" : syncedAt ? `Updated ${relativeTime(syncedAt)}` : ""}
        </p>
        <button
          onClick={refresh}
          disabled={loading !== null}
          className="flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-border px-3.5 text-sm font-medium transition-colors hover:border-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
          Refresh
        </button>
      </div>

      {items.length === 0 && loading === null ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
          <p className="text-muted">No questions yet.</p>
          <Link
            href={`/events/${eventId}`}
            className="mt-2 inline-block font-medium text-accent underline underline-offset-4"
          >
            Be the first to ask →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <li key={q.id}>
              <QuestionCard q={q} />
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <button
          onClick={loadMore}
          disabled={loading !== null}
          className="mt-4 min-h-[3rem] w-full rounded-xl border border-border text-sm font-medium transition-colors hover:border-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {loading === "more" ? "Loading…" : "Load more"}
        </button>
      )}
    </>
  );
}
