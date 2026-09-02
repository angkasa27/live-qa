/** A hairline with a word on it. Separates what a session needs from what it can also have. */
export default function FormSection({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="font-mono text-[0.6875rem] tracking-[0.12em] text-faint uppercase">
        {label}
      </span>
      <span className="h-px flex-1 bg-border-soft" aria-hidden />
    </div>
  );
}
