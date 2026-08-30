import Skeleton, { CardSkeleton } from "@/components/Skeleton";

/** One fallback for every route: they all render a title over a stack of cards, and a segment
 *  that needs its own shape can still drop a loading.tsx beside its page. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-6 sm:px-6">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="mt-2.5 h-4 w-2/3" />
      <div className="mt-6">
        <CardSkeleton />
      </div>
    </main>
  );
}
