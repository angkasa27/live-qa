"use client";

import { Check, ChevronRight, Copy, Download, MonitorPlay, Share2 } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemMedia, ItemTitle, ItemDescription } from "@/components/ui/item";

/**
 * The majelis as something you can put in front of a room.
 *
 * This was two icons in the session bar — a QR sheet and a link to the speaker screen —
 * which were one job wearing two hats: getting the session onto a wall, a projector or into
 * a WhatsApp group. One screen, three ways out, in the order a session actually needs them.
 *
 * One 1024px PNG serves both the preview and the download: it scales down without a second
 * encode, and it is large enough to print at poster size.
 */
const noop = () => () => {};

export default function ShareCard({ eventId, name }: { eventId: string; name: string }) {
  /**
   * The public origin is whatever the admin actually reached this page on, which is right on
   * localhost, on a preview deploy and in production alike — no env var to get wrong. Read
   * through a store rather than an effect: it is a client-only value with a known server
   * snapshot (empty), which is exactly what this hook is for, and writing it with setState
   * inside an effect is a cascading render.
   */
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const url = origin ? `${origin}/events/${eventId}` : "";

  const [png, setPng] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;
    let live = true;
    QRCode.toDataURL(url, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#1c1a17ff", light: "#ffffffff" },
    }).then(
      (data) => live && setPng(data),
      () => live && setPng(null)
    );
    return () => {
      live = false;
    };
  }, [url]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch {
        // Cancelled, or unavailable in this context — fall through to copying.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="p-5">
      <div className="mx-auto w-[13.25rem] rounded-md border border-border bg-white p-4">
        {png ? (
          // eslint-disable-next-line @next/next/no-img-element -- a data: URI, nothing to optimise
          <img src={png} alt={`Kode QR menuju halaman ${name}`} className="aspect-square w-full" />
        ) : (
          <div className="aspect-square w-full animate-pulse rounded-sm bg-muted" />
        )}
      </div>

      <p className="mt-3.5 text-center text-md break-all text-muted-foreground">
        {url ? (
          <>
            {url.replace(/\/events\/.*$/, "/events/")}
            <strong className="font-bold text-foreground">{eventId}</strong>
          </>
        ) : (
          "…"
        )}
      </p>

      <div className="mt-4 space-y-2.5">
        <Item variant="boxed" render={<Link href={`/admin/events/${eventId}/speaker`} />}>
          <ItemMedia className="size-10 rounded-sm bg-accent">
            <MonitorPlay className="size-5 stroke-primary" aria-hidden />
          </ItemMedia>
          <ItemContent className="gap-0.5">
            <ItemTitle className="text-md">Layar pemateri</ItemTitle>
            <ItemDescription className="text-xs">Untuk proyektor.</ItemDescription>
          </ItemContent>
          <ChevronRight className="size-4.5 shrink-0 stroke-faint stroke-[2.2]" aria-hidden />
        </Item>

        <Item variant="boxed" render={<button type="button" onClick={share} />}>
          <ItemMedia className="size-10 rounded-sm bg-accent">
            {copied ? (
              <Check className="size-5 stroke-primary" aria-hidden />
            ) : (
              <Share2 className="size-5 stroke-primary" aria-hidden />
            )}
          </ItemMedia>
          <ItemContent className="gap-0.5">
            <ItemTitle className="text-md">
              {copied ? "Tautan disalin" : "Bagikan tautan"}
            </ItemTitle>
            <ItemDescription className="text-xs">Untuk grup jamaah.</ItemDescription>
          </ItemContent>
          <Copy className="size-4.5 shrink-0 stroke-faint stroke-[2.2]" aria-hidden />
        </Item>
      </div>

      <Button
        variant="outline"
        size="lg"
        className="mt-2.5"
        disabled={!png}
        render={<a href={png ?? undefined} download={`qr-${eventId}.png`} />}
      >
        <Download aria-hidden />
        Unduh PNG
      </Button>
    </div>
  );
}
