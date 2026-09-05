import { useSyncExternalStore } from "react";

/**
 * The origin a jamaah reaches this majelis on — the one that goes in a QR code, a printed
 * poster and a WhatsApp forward.
 *
 * This used to be `window.location.origin` alone, on the reasoning that whatever host the
 * admin actually reached the page on is right on localhost, on a preview deploy and in
 * production alike, with no env var to get wrong. That is true for a link you paste into a
 * chat and false for everything durable: an operator who opens the board from a Vercel
 * preview and prints the QR ships a poster pointing at the preview, and a QR on a wall
 * outlives the deployment it was generated from.
 *
 * So: `NEXT_PUBLIC_SITE_URL` when set, the current origin when not. Production sets it and
 * every printed code is canonical; development leaves it blank and keeps the old
 * convenience, including `next dev` moving off port 3000.
 *
 * NEXT_PUBLIC_ because the QR is generated in the browser. It is a public address on a
 * poster — there is nothing here to keep secret.
 */
const CONFIGURED = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ?? "";

const subscribe = () => () => {};

/**
 * Empty on the server pass when nothing is configured, then the live origin once hydrated —
 * `window` does not exist server-side, and rendering two different strings is a hydration
 * error. With the variable set, both passes agree immediately and there is no flash.
 */
export function useSiteOrigin() {
  return useSyncExternalStore(
    subscribe,
    () => CONFIGURED || window.location.origin,
    () => CONFIGURED,
  );
}

/** The public address of a majelis. Empty string until the origin is known. */
export function eventUrl(origin: string, id: string) {
  return origin ? `${origin}/events/${id}` : "";
}

/**
 * How an address is shown in a form: no scheme, trailing slash kept, so a slug field reads
 * "sual.id/events/" + what you are typing. Falls back to a bare path before hydration, which
 * is what a local dev with nothing configured sees anyway.
 */
export function eventUrlPrefix(origin: string) {
  return `${origin.replace(/^https?:\/\//, "")}/events/`;
}
