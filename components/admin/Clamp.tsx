"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Long text, folded to a few lines with a way to open it.
 *
 * The admin board is a queue: its job is to let an operator see how much is left and pick the
 * next thing, which a screen-and-a-half of one answer defeats. A single seeded answer here ran
 * to 414px, so seven of them made a page nobody could scan.
 *
 * The toggle appears only when the text is actually cut off, measured rather than guessed —
 * offering "Selengkapnya" under a paragraph that is already whole is a promise the button
 * cannot keep, and on this screen most questions are short enough to fit.
 */
export default function Clamp({
  children,
  lines = 4,
  className = "",
}: {
  children: React.ReactNode;
  lines?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [clipped, setClipped] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    // Only meaningful while the clamp is applied; once open the element is its full height.
    if (el && !open) setClipped(el.scrollHeight > el.clientHeight + 1);
  }, [open]);

  useLayoutEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    // Fonts land after first paint and the column reflows on rotate; both change the answer.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <>
      <div
        ref={ref}
        className={className}
        style={
          open
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: lines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
      >
        {children}
      </div>
      {(clipped || open) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 min-h-9 text-[0.8125rem] font-semibold text-primary underline underline-offset-4"
        >
          {open ? "Ringkas" : "Selengkapnya"}
        </button>
      )}
    </>
  );
}
