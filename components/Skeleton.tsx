export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-border ${className}`} />;
}

/** Every list in this app is the same shape: a card with a heading and a line or two under it. */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status">
      <span className="sr-only">Memuat…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4" aria-hidden>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-2.5 h-4 w-1/2" />
          <Skeleton className="mt-4 h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
