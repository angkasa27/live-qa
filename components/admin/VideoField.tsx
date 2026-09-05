"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { parseVideoId } from "@/lib/types";

/**
 * The YouTube link, with the id we understood echoed back and the still shown once it parses.
 * A recording pasted from a phone is easy to get wrong and expensive to get wrong quietly: the
 * wrong id is what Gemini would then read to draft answers, and what the replay anchors point
 * into. Confirming with the actual thumbnail is the cheapest way to catch it.
 *
 * A still rather than an embedded player: nothing on this form seeks, and an iframe per keystroke
 * is a lot of machinery to say "yes, that one".
 */
export default function VideoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const trimmed = value.trim();
  const videoId = trimmed ? parseVideoId(trimmed) : null;

  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor="video" className="font-medium">
        Tautan siaran atau rekaman{" "}
        <span className="font-normal text-muted-foreground">(opsional)</span>
      </FieldLabel>

      <Input
        id="video"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="youtu.be/…"
        aria-invalid={Boolean(trimmed) && !videoId}
      />

      {videoId && (
        <div className="mt-1 flex items-center gap-2.5 rounded-md border border-accent-border bg-accent p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote still, no loader configured */}
          <img
            src={`https://i.ytimg.com/vi/${videoId}/default.jpg`}
            alt=""
            className="h-10 w-[4.25rem] shrink-0 rounded object-cover"
          />
          <p className="min-w-0 text-xs leading-relaxed text-accent-foreground">
            Video dikenali. Tautan YouTube, youtu.be, atau ID saja bisa dipakai.
          </p>
        </div>
      )}

      {trimmed && !videoId && (
        <p className="mt-0.5 text-xs text-destructive">
          Tautan tidak dikenali. Tempel tautan YouTube, youtu.be, atau ID videonya saja.
        </p>
      )}
    </Field>
  );
}
