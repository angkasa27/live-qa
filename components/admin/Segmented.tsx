"use client";

/**
 * One row of mutually exclusive choices, equal widths so it fills a phone screen edge to edge.
 *
 * Kept rather than replaced by shadcn's toggle-group: that pair is 134 lines to this one's 40,
 * marks selection with a neutral surface instead of a fill, and sizes its items below the touch
 * floor. See docs/DESIGN.md § Keep, do not replace.
 *
 * `activeClassName` exists because the fill is not always the green: the session's own status
 * is ink, and manual review is warn-toned, because a queue held for approval is the state that
 * wants noticing. Anything else is the default.
 */
export default function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  activeClassName = "bg-primary text-primary-foreground",
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
  label: string;
  activeClassName?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-xl border border-border bg-background p-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`min-h-11 flex-1 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
            value === v ? `font-semibold ${activeClassName}` : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
