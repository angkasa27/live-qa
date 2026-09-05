import Skeleton, { CardSkeleton } from "@/components/Skeleton";

/** One fallback for every route: they all render a title over a stack of bands, and a segment
 *  that needs its own shape can still drop a loading.tsx beside its page. */
export default function Loading() {
  return (
    <main className="page flex-1 pb-20">
      <div className="px-5 pt-5 pb-4">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="mt-2.5 h-4 w-2/3" />
      </div>
      <CardSkeleton />
    </main>
  );
}
