export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-border ${className}`} />;
}

/**
 * Every list in this app is now the same shape: a flat band with a line of meta over a
 * question. No card, because the thing it stands in for has no card either — a skeleton that
 * draws a border the real content does not have is a layout shift waiting to happen.
 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status">
      <span className="sr-only">Memuat…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="border-t border-border-soft px-5 py-5" aria-hidden>
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="mt-3 h-4 w-11/12" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
