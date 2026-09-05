"use client";

import { Radio, RotateCcw, SlidersHorizontal, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import Spinner from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Field, FieldContent, FieldDescription, FieldTitle } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { updateEvent } from "@/lib/actions";
import type { Event } from "@/lib/types";

/**
 * Where a session goes next, as one move naming what happens.
 *
 * The old control was a three-way status picker, which asks the operator to hold a state
 * machine in their head and offers two wrong answers next to the right one. A majelis only
 * ever moves scheduled → live → archived, so each stage has exactly one move.
 *
 * Every move hands `acceptingQuestions` back to `null` rather than pinning it true or false.
 * Pinning worked, but it meant `coalesce(accepting_questions, status = 'live')` — the whole
 * point of the nullable column — fired once and never again, so the switch was writing an
 * override with nothing left to override. Null makes each stage carry its own default (open
 * while live, closed otherwise) and turns the switch back into a real exception that the next
 * move clears. Reopening an archive *for questions* is still that exception.
 */
function nextMove(status: Event["status"]) {
  if (status === "scheduled")
    return {
      label: "Mulai sesi",
      icon: Radio,
      patch: { status: "live" as const, acceptingQuestions: null },
    };
  if (status === "live")
    return {
      label: "Selesaikan sesi",
      icon: Square,
      patch: { status: "archived" as const, acceptingQuestions: null },
    };
  // Archived used to be the end of the line, on the grounds that reopening belonged "with the
  // rest of the rare, considered edits" — except no such edit existed, so a session stopped by
  // a mis-aimed thumb could never be started again.
  return {
    label: "Buka lagi sesi",
    icon: RotateCcw,
    patch: { status: "live" as const, acceptingQuestions: null },
  };
}

/**
 * The session's one move, and behind a second button everything else about how it is running.
 *
 * It sits in the bottom bar because that is where the thumb already is. The controls used to
 * be a strip of pills pinned under the toolbar — reachable, but occupying the top of every
 * screen to say three things that change perhaps twice a session, and stealing the space the
 * majelis itself should be using. Now the page is the session: its recording or poster, what
 * it is, then the queue. The bar carries the one thing an operator presses.
 *
 * The three switches are switches, not chips. A chip has to spell out its own state in words
 * ("Pertanyaan dibuka" / "Pertanyaan ditutup") because a pill that only changes colour is a
 * pill whose meaning you have to remember. Given a drawer with room for a label and a line of
 * explanation, a switch says the same thing with its position and leaves the words free to
 * describe what the setting *does*.
 */
export function SessionActions({ event, canEdit }: { event: Event; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Optimistic, because a switch that waits for a round trip before moving reads as broken.
  const [accepting, setAccepting] = useState(event.acceptingQuestions);
  const [manual, setManual] = useState(event.moderation === "manual");
  const [shown, setShown] = useState(!event.hidden);

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

  const next = nextMove(event.status);
  const Icon = next.icon;

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Button
          size="lg"
          className="min-w-0 flex-1"
          disabled={pending}
          onClick={() => push(next.patch, () => {})}
        >
          {pending ? <Spinner /> : <Icon aria-hidden />}
          {next.label}
        </Button>

        <Drawer>
          <DrawerTrigger
            render={
              <Button
                  variant="outline"
                  size="icon"
                  aria-label="Pengaturan sesi"
                  className="size-[54px] shrink-0 rounded-md"
                >
                <SlidersHorizontal aria-hidden />
              </Button>
            }
          />
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Pengaturan sesi</DrawerTitle>
              <DrawerDescription>Berlaku seketika, tanpa disimpan.</DrawerDescription>
            </DrawerHeader>

            <div className="flex flex-col gap-1 px-4 pb-2">
              <SettingRow
                title="Terima pertanyaan"
                description="Jamaah bisa mengirim pertanyaan baru. Terbuka sendiri selama sesi berlangsung."
                checked={accepting}
                disabled={pending}
                onChange={(v) => {
                  setAccepting(v);
                  push({ acceptingQuestions: v }, () => setAccepting(!v));
                }}
              />

              <SettingRow
                title="Review dulu"
                description="Pertanyaan masuk ke antrean Anda sebelum tampil. Matikan agar langsung tayang."
                checked={manual}
                disabled={pending}
                onChange={(v) => {
                  setManual(v);
                  push({ moderation: v ? "manual" : "auto" }, () => setManual(!v));
                }}
              />

              {/* Visibility is a fact about what the session is doing now, so it belongs with
                  the other two rather than inside a form about names and venues — where it
                  was, mislabelled "Arsip dapat diakses publik" while it actually hid the
                  majelis at every stage. Superadmin only, matching lib/actions.ts. */}
              {canEdit && (
                <SettingRow
                  title="Tampil ke publik"
                  description="Matikan dan halaman majelis hilang dari daftar dan tertutup bagi siapa pun."
                  checked={shown}
                  disabled={pending}
                  onChange={(v) => {
                    setShown(v);
                    push({ hidden: !v }, () => setShown(!v));
                  }}
                />
              )}
            </div>

            <div className="px-4 pb-4" aria-live="polite">
              {error && <p className="mb-3 text-sm font-bold text-destructive">{error}</p>}
              <DrawerClose render={<Button variant="outline" size="lg">Tutup</Button>} />
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Outside the drawer too: a failed move is reported by the button that made it, and the
          drawer may well be shut by the time the server answers. */}
      <div aria-live="polite">
        {error && <p className="mt-2 text-center text-sm font-bold text-destructive">{error}</p>}
      </div>
    </>
  );
}

function SettingRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Field orientation="horizontal" className="gap-4 py-3">
      <FieldContent>
        <FieldTitle>{title}</FieldTitle>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </Field>
  );
}
