import { cn } from "@/lib/utils";

/**
 * What a majelis looks like before anyone uploads a cover, and what an upcoming session
 * usually looks like forever — most are announced without artwork.
 *
 * A mihrab arch on the deep end of the brand green, rather than a grey box or a generic
 * image icon: at 16:9 in a list of real YouTube thumbnails it has to read as "this majelis
 * has no picture yet", not as "this image failed to load".
 */
export default function Poster({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid aspect-video w-full place-items-center bg-[linear-gradient(155deg,#1d7a62_0%,#16624f_45%,#0b3d31_100%)] text-white/45",
        className
      )}
      {...props}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="h-[46%] w-auto"
        aria-hidden
      >
        <path d="M16 4c-5 0-8 3.4-8 8v16h16V12c0-4.6-3-8-8-8z" />
        <path d="M16 12v16M8 20h16" />
      </svg>
    </div>
  );
}
