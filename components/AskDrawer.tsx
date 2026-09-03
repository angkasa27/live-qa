"use client";

import { ArrowLeft, Check, ListChecks, PenLine, Send, VenetianMask } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { addQuestion } from "@/lib/actions";
import { MAX_BODY } from "@/lib/types";

/**
 * Asking used to be a route. It reached a page that 404s the moment a session stops taking
 * questions — which is every archived majelis — so a stale tab or a back button landed on a
 * dead end, and the whole trip was a navigation away from the thing being asked about.
 *
 * As a sheet over the majelis it cannot 404, the question stays on screen beside the session
 * it belongs to, and P2's "well under a minute" loses two page loads.
 *
 * These let the question list on the same page talk to the sheet without either owning the
 * other: the empty state opens it, and a successful send tells the list to refetch so the
 * asker's own question is there when the sheet closes. The list is otherwise on-demand by
 * design (P4), and this does not change that — it is one refetch, caused by the asker.
 */
export const ASK_OPEN = "sual:ask-open";
export const ASK_SENT = "sual:ask-sent";

export default function AskDrawer({
  eventId,
  moderated,
}: {
  eventId: string;
  /** Manual moderation: say so before the send, not after the question seems to vanish. */
  moderated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [author, setAuthor] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(ASK_OPEN, onOpen);
    return () => window.removeEventListener(ASK_OPEN, onOpen);
  }, []);

  const trimmed = body.trim();
  const over = body.length > MAX_BODY;
  const canSend = trimmed.length > 0 && !over && !busy;

  const counterTone = over
    ? "text-destructive"
    : body.length > MAX_BODY - 50
      ? "text-warn"
      : "text-faint";

  function close() {
    setOpen(false);
    // Reopening should offer a blank sheet, not the confirmation of the last question.
    if (sent) {
      setSent(false);
      setError(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) return setError("Tulis pertanyaan Anda dulu.");
    if (over) return setError(`Maksimal ${MAX_BODY} karakter.`);

    setError(null);
    setBusy(true);
    try {
      // The server re-checks all of this. What's above is only there to save a round trip.
      const res = await addQuestion({
        eventId,
        body: trimmed,
        author: anonymous ? null : author.trim() || null,
        contact: contact.trim() || null,
      });
      if (!res.ok) return setError(res.error);
      setBody("");
      setSent(true);
      window.dispatchEvent(new CustomEvent(ASK_SENT));
    } catch {
      setError(
        "Koneksi terputus. Pertanyaan Anda masih tersimpan di sini — tekan kirim lagi.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <div className="sticky bottom-0 border-t border-border-soft bg-background/90 px-4 pt-3 backdrop-blur sm:px-6 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="page flex min-h-13 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <PenLine className="h-[18px] w-[18px]" aria-hidden />
          Kirim pertanyaan
        </button>
      </div>

      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="flex flex-row items-center justify-between gap-3 border-b border-border pb-3">
          <DrawerTitle className="text-lg font-semibold">
            {sent ? "Terkirim" : "Kirim pertanyaan"}
          </DrawerTitle>
          <DrawerClose className="min-h-9 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Tutup
          </DrawerClose>
        </DrawerHeader>

        {sent ? (
          <Confirmation moderated={moderated} onBack={close} />
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <label htmlFor="body" className="block text-sm font-semibold">
                  Pertanyaan Anda
                </label>
                <Textarea
                  id="body"
                  autoFocus
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Apa yang ingin Anda tanyakan?"
                  aria-invalid={over}
                  className="mt-2 resize-none rounded-xl bg-card font-serif text-[1.0625rem] placeholder:font-sans"
                />
                <p className="mt-[7px] flex items-center justify-between text-xs text-faint">
                  <span>Maksimal {MAX_BODY} karakter</span>
                  <span className={`tabular-nums ${counterTone}`}>
                    {body.length} / {MAX_BODY}
                  </span>
                </p>
              </div>

              <div className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border bg-card">
                {/* Anonymity is display, not identity: this hides the name from the page and
                    says nothing about the address below it. See REQUIREMENTS.md § Invariants. */}
                <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-3.5 py-2.5">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                      <VenetianMask className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
                      Tanya secara anonim
                    </span>
                    <span className="mt-0.5 block text-xs text-faint">Nama tidak ditampilkan</span>
                  </span>
                  <Switch checked={anonymous} onCheckedChange={setAnonymous} />
                </label>

                {!anonymous && (
                  <div className="px-3.5 py-3">
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="author" className="font-semibold">
                        Nama Anda
                      </FieldLabel>
                      <Input
                        id="author"
                        value={author}
                        autoComplete="name"
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="mis. Rani"
                      />
                    </Field>
                  </div>
                )}

                <div className="px-3.5 py-3">
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="contact" className="font-semibold">
                      Email <span className="font-normal text-muted-foreground">(opsional)</span>
                    </FieldLabel>
                    <Input
                      id="contact"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="nama@email.com"
                    />
                    <FieldDescription className="text-xs">
                      Hanya untuk memberi tahu Anda saat jawaban terbit. Tidak pernah ditampilkan,
                      juga bila Anda menulis nama.
                    </FieldDescription>
                  </Field>
                </div>
              </div>

              {/* Manual review is the difference between "sent" and "published", and it is
                  cheaper to say so before the send than to explain a vanished question. */}
              {moderated && (
                <Alert variant="warn" className="rounded-xl text-[0.8125rem]">
                  <AlertDescription>
                    Majelis ini memakai review admin. Pertanyaan Anda tampil setelah disetujui.
                  </AlertDescription>
                </Alert>
              )}

              <div aria-live="polite">
                {error && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-border p-4 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
              <button
                type="submit"
                disabled={!canSend}
                className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {busy ? <Spinner /> : <Send className="h-[18px] w-[18px]" aria-hidden />}
                {busy ? "Mengirim…" : error ? "Coba kirim lagi" : "Kirim pertanyaan"}
              </button>
            </div>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * P3: confirmation states what happens next, and that differs by review mode. Two texts, not
 * one hedged text that covers both — "menunggu disetujui" and "langsung tampil" are different
 * promises, and saying the wrong one is what makes people submit twice.
 */
function Confirmation({ moderated, onBack }: { moderated: boolean; onBack: () => void }) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-7 text-center">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent-border bg-accent text-primary"
          aria-hidden
        >
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <h2 className="mt-3.5 font-serif text-[1.4375rem] leading-snug font-medium">
          {moderated ? "Pertanyaan Anda terkirim" : "Sudah masuk antrean"}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty">
          {moderated
            ? "Majelis ini memakai review admin, jadi pertanyaan Anda menunggu disetujui sebelum tampil. Tidak perlu mengirim ulang."
            : "Pertanyaan Anda langsung tampil dan sudah terbaca oleh admin majelis. Urutannya sesuai waktu bertanya."}
        </p>

        {/* The pending question is visible to its asker and to nobody else. Saying so is what
            stops a second submission and the admin moderating one question twice. */}
        {moderated && (
          <Alert variant="warn" className="mt-4 rounded-xl text-left text-[0.8125rem]">
            <AlertDescription>
              Anda tetap bisa melihat pertanyaan ini di daftar — ditandai{" "}
              <strong className="font-bold">menunggu review</strong> dan hanya terlihat oleh Anda.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="shrink-0 space-y-2.5 border-t border-border p-4 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
        <Link
          href="/pertanyaan-saya"
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ListChecks className="h-[18px] w-[18px]" aria-hidden />
          Lihat pertanyaan saya
        </Link>
        {/* Closing is the way back: the majelis is already behind this sheet. */}
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-[0.9375rem] font-semibold transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke majelis
        </button>
      </div>
    </>
  );
}
