/**
 * A labelled text input. The `id` is required rather than generated: the label has to point at
 * the input for a screen reader, and a caller that can't name the field probably has a bug.
 * `children` is for whatever sits under the box, like the parsed-video echo.
 */
export default function Field({
  label,
  id,
  hint,
  children,
  ...input
}: {
  label: React.ReactNode;
  id: string;
  hint?: string;
  children?: React.ReactNode;
} & React.ComponentProps<"input">) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <input
        id={id}
        {...input}
        className="mt-1.5 min-h-[2.75rem] w-full rounded-lg border border-border bg-background px-3 outline-none transition-colors placeholder:text-muted focus:border-accent"
      />
      {children}
    </div>
  );
}
