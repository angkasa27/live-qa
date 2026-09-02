"use client";

import Field from "@/components/admin/Field";
import { EMBED_ORIGIN } from "@/components/Player";
import { parseVideoId } from "@/lib/types";

/**
 * The YouTube link, with the id we understood echoed back and the video itself shown once it
 * parses. A recording pasted from a phone is easy to get wrong and expensive to get wrong
 * quietly: the wrong id is what Gemini would then read to draft answers.
 *
 * A plain iframe rather than <Player>: nothing here seeks, so there is no reason to pull in the
 * postMessage plumbing or put a seek context on an admin form.
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
    <Field
      id="video"
      label={
        <>
          Rekaman atau siaran YouTube <span className="font-normal text-muted-foreground">(opsional)</span>
        </>
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="https://youtu.be/…"
    >
      {trimmed && (
        <p className={`mt-1.5 text-xs ${videoId ? "text-muted-foreground" : "text-destructive"}`}>
          {videoId ? `Video dikenali: ${videoId}` : "Tautan tidak dikenali."}
        </p>
      )}
      {videoId && (
        <div className="mt-2.5 aspect-video w-full overflow-hidden rounded-lg bg-border">
          <iframe
            src={`${EMBED_ORIGIN}/embed/${videoId}`}
            title="Pratinjau rekaman"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      )}
    </Field>
  );
}
