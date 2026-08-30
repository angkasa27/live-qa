/** The deck owns the whole viewport and is dark; the light skeleton would flash white first. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-500" role="status">
      Memuat…
    </div>
  );
}
