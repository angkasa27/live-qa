"use client";

import { Check, Copy, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * The majelis as something you can point a phone at.
 *
 * A session is announced on a wall, a screen or a printed sheet, and none of those can be
 * tapped. The address is short and readable by design (it is the slug), but typing it is still
 * the slowest thing we ask of anyone, so this is the one control that turns it into a camera.
 *
 * One 1024px PNG serves both the preview and the download: it scales down without a second
 * encode, and it is large enough to print at poster size. Generated on open rather than on
 * mount — the icon is on every session and almost nobody opens it.
 */
export default function QrDrawer({ eventId, name }: { eventId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [png, setPng] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function show() {
    setOpen(true);
    // The public origin is whatever the admin actually reached this page on, which is right on
    // localhost, on a preview deploy and in production alike. No env var to get wrong.
    const href = `${window.location.origin}/events/${eventId}`;
    setUrl(href);
    QRCode.toDataURL(href, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#1c1a17ff", light: "#ffffffff" },
    }).then(setPng, () => setPng(null));
  }

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <Drawer open={open} onOpenChange={(v) => (v ? show() : setOpen(false))}>
      <DrawerTrigger
        aria-label="Kode QR majelis"
        className="flex h-11 w-11 items-center justify-center rounded-lg text-[#e8e5df] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8e5df]"
      >
        <QrCode className="h-5 w-5" aria-hidden />
      </DrawerTrigger>

      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="flex flex-row items-center justify-between gap-3 border-b border-border pb-3">
          <DrawerTitle className="text-lg font-semibold">Kode QR</DrawerTitle>
          <DrawerClose className="min-h-9 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Tutup
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="mx-auto w-full max-w-[17rem] overflow-hidden rounded-xl border border-border bg-white p-3">
            {png ? (
              // eslint-disable-next-line @next/next/no-img-element -- a data: URI, nothing to optimise
              <img
                src={png}
                alt={`Kode QR menuju halaman ${name}`}
                className="aspect-square w-full"
              />
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-lg bg-muted" />
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground text-pretty">
            Arahkan kamera ke kode ini untuk membuka halaman jamaah.
          </p>

          <div className="rounded-xl border border-border bg-card p-3">
            <p className="font-mono text-xs break-all text-muted-foreground">{url || "…"}</p>
          </div>
        </div>

        <div className="shrink-0 space-y-2.5 border-t border-border p-4 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
          <a
            href={png ?? undefined}
            download={`qr-${eventId}.png`}
            aria-disabled={!png}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90 aria-disabled:pointer-events-none aria-disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Download className="h-[18px] w-[18px]" aria-hidden />
            Unduh PNG
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {copied ? (
              <Check className="h-4 w-4 text-primary" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
            {copied ? "Tautan disalin" : "Salin tautan"}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
