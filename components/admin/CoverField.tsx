"use client";

import { ImageOff } from "lucide-react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * The list thumbnail. Shown at the ratio it will actually be cropped to, because a cover that
 * looks right in a square preview and loses the speaker's face at 16:9 is the failure this
 * panel exists to prevent.
 *
 * Optional on purpose: REQUIREMENTS.md P1 says the product works with no cover at all, so the
 * empty state is a calm placeholder rather than a prompt.
 */
export default function CoverField({
  value,
  onChange,
  fallback,
}: {
  value: string;
  onChange: (value: string) => void;
  /** The YouTube still, used when no explicit cover is set. */
  fallback?: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const shown = value.trim() || fallback || null;

  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor="image" className="font-medium">
        Gambar sampul <span className="font-normal text-muted-foreground">(16:9)</span>
      </FieldLabel>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote covers, no loader configured
          <img src={shown} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-faint">
            <ImageOff className="h-6 w-6" aria-hidden />
            <span className="text-xs">Belum ada sampul</span>
          </div>
        )}

        {shown && (
          <Badge variant="outline" className="absolute top-2.5 left-2.5 bg-card/90 text-[0.625rem]">
            {value.trim() ? "Sampul khusus" : "Dari rekaman"}
          </Badge>
        )}

        <button
          type="button"
          onClick={() => input.current?.focus()}
          className="absolute right-2.5 bottom-2.5 min-h-9 rounded-lg border border-border bg-card/90 px-3 text-[0.8125rem] font-semibold backdrop-blur transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {shown ? "Ganti" : "Tambah"}
        </button>
      </div>

      <FieldDescription className="-mt-0.5 text-xs">
        Dipotong ke 16:9 di semua tampilan. Tanpa sampul, kartu tetap tampil rapi.
      </FieldDescription>

      <Input
        ref={input}
        id="image"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
      />
    </Field>
  );
}
