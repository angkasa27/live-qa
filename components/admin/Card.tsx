/** A titled section of a form. Both event forms are built out of these. */
export default function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </h2>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}
