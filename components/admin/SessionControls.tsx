"use client";

import { Check, Radio, Square, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import Spinner from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Toggle, ToggleOff, ToggleOn } from "@/components/ui/toggle";
import { updateEvent } from "@/lib/actions";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The two things that change mid-session, on the board itself.
 *
 * They used to live in a settings sheet alongside ten fields that only matter before or
 * after a majelis — name, slug, venue, cover, staff. An operator working a live queue was
 * opening a form to flip a switch. These are the only controls that belong to the hour the
 * session is running, so they are the only ones here; everything else moved to "Ubah sesi".
 */
export function SessionDeck({ event, when }: { event: Event; when: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Optimistic, because a toggle that waits for a round trip before moving reads as broken.
  const [accepting, setAccepting] = useState(event.acceptingQuestions);
  const [manual, setManual] = useState(event.moderation === "manual");

  function push(patch: Parameters<typeof updateEvent>[1], rollback: () => void) {
    setError(null);
    start(async () => {
      const res = await updateEvent(event.id, patch);
      if (res.ok) router.refresh();
      else {
        rollback();
        setError(res.error);
      }
    });
  }

  return (
    <div className="sticky top-14 z-19 border-b border-border-soft bg-card">
      <div className="page flex items-center gap-2 overflow-x-auto px-4 py-2.5">
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 pr-1 text-sm font-bold",
            event.status === "live" ? "text-live" : "text-muted-foreground"
          )}
        >
          {event.status === "live" && (
            <span className="size-2 shrink-0 rounded-full bg-current motion-safe:animate-pulse" aria-hidden />
          )}
          {when}
        </span>

        <Toggle
          pressed={accepting}
          disabled={pending}
          onPressedChange={(v) => {
            setAccepting(v);
            push({ acceptingQuestions: v }, () => setAccepting(!v));
          }}
        >
          <ToggleOn>
            <Check aria-hidden />
            Pertanyaan dibuka
          </ToggleOn>
          <ToggleOff>
            <X aria-hidden />
            Pertanyaan ditutup
          </ToggleOff>
        </Toggle>

        <Toggle
          variant="warning"
          pressed={manual}
          disabled={pending}
          onPressedChange={(v) => {
            setManual(v);
            push({ moderation: v ? "manual" : "auto" }, () => setManual(!v));
          }}
        >
          <ToggleOn>
            <Radio aria-hidden />
            Review dulu
          </ToggleOn>
          <ToggleOff>
            <Zap aria-hidden />
            Langsung tayang
          </ToggleOff>
        </Toggle>
      </div>

      <div aria-live="polite">
        {error && <p className="px-5 pb-2 text-sm font-bold text-destructive">{error}</p>}
      </div>
    </div>
  );
}

/**
 * Where a session goes next, as one button naming what happens.
 *
 * The old control was a three-way status picker, which asks the operator to hold a state
 * machine in their head and offers two wrong answers next to the right one. A majelis only
 * ever moves scheduled → live → archived, so each stage has exactly one move, and the line
 * underneath says what it will do before it does it.
 *
 * It sits after the queue because that is where an operator is when the session is over.
 */
export function SessionEndzone({ event }: { event: Event }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const next =
    event.status === "scheduled"
      ? {
          label: "Mulai sesi",
          why: "Pertanyaan dibuka, sesi tampil sebagai berlangsung.",
          icon: Radio,
          patch: { status: "live" as const, acceptingQuestions: true },
        }
      : event.status === "live"
        ? {
            label: "Selesaikan sesi",
            why: "Pertanyaan ditutup, sesi masuk arsip.",
            icon: Square,
            patch: { status: "archived" as const, acceptingQuestions: false },
          }
        : null;

  // An archived session has nowhere left to go. Reopening one is a deliberate act that
  // belongs with the rest of the rare, considered edits, not under a live queue.
  if (!next) return null;

  const Icon = next.icon;
  return (
    <div className="mx-4 mt-6 mb-6 border-t border-border-soft pt-4.5">
      <Button
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await updateEvent(event.id, next.patch);
            if (res.ok) router.refresh();
            else setError(res.error);
          });
        }}
      >
        {pending ? <Spinner /> : <Icon aria-hidden />}
        {next.label}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground" aria-live="polite">
        {error ? <span className="font-bold text-destructive">{error}</span> : next.why}
      </p>
    </div>
  );
}
