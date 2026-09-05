"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircleDashed, RefreshCw } from "lucide-react";
import Link from "next/link";

import QuestionItem from "@/components/QuestionItem";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { fetchPage } from "@/lib/actions";
import type { Question } from "@/lib/types";

export default function QuestionList({
  eventId,
  speaker,
  youtubeId,
  total,
  canAsk = false,
  note,
}: {
  eventId: string;
  /** Credits the answers: "Ustadz Hafizh menjawab". */
  speaker?: string;
  youtubeId?: string;
  /** Counted on the server, so the heading is right before the first page arrives. */
  total: number;
  /** Live events point an empty list at the form; a recorded archive has nowhere to send you. */
  canAsk?: boolean;
  /** One line under the heading — the archive uses it to explain the timestamps. */
  note?: string;
}) {
  const [items, setItems] = useState<Question[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<"refresh" | "more" | null>("refresh");

  const applyFirstPage = useCallback((page: { items: Question[]; nextCursor: string | null }) => {
    setItems(page.items);
    setCursor(page.nextCursor);
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

  // The asker's own pending question can be in the list without being in the public count.
  const heading = Math.max(total, items.length);

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-5 pt-4.5 pb-1">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">{heading} pertanyaan</h2>
        <Button
          type="button"
          variant="outline"
          size="chip"
          onClick={refresh}
          disabled={loading !== null}
          aria-label="Muat pertanyaan baru"
        >
          <RefreshCw
            className={loading === "refresh" ? "animate-spin" : undefined}
            strokeWidth={2.4}
            aria-hidden
          />
        </Button>
      </div>

      {note && <p className="px-5 pt-1.5 pb-4 text-sm leading-relaxed text-muted-foreground">{note}</p>}

      {items.length === 0 && loading === null ? (
        <Empty className="border-t border-border-soft">
          <EmptyMedia variant="icon" className="bg-accent text-accent-foreground">
            <MessageCircleDashed aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="text-xl font-bold">Belum ada pertanyaan.</EmptyTitle>
          <EmptyDescription>
            {canAsk
              ? "Majelis baru dimulai. Pertanyaan pertama boleh dari Anda."
              : "Belum ada pertanyaan pada majelis ini."}
          </EmptyDescription>
          {canAsk && (
            <Link
              href={`/events/${eventId}/tanya`}
              className="mt-1 font-bold text-primary underline underline-offset-4"
            >
              Kirim pertanyaan
            </Link>
          )}
        </Empty>
      ) : (
        <div>
          {items.map((q) => (
            <QuestionItem key={q.id} q={q} speaker={speaker} youtubeId={youtubeId} />
          ))}
        </div>
      )}

      {cursor && (
        <div className="p-5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={loadMore}
            disabled={loading !== null}
          >
            {loading === "more" ? "Memuat…" : "Muat pertanyaan lagi"}
          </Button>
        </div>
      )}
    </>
  );
}
