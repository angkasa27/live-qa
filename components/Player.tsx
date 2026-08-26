"use client";

import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";

// The YouTube embed accepts commands over postMessage when the src carries `enablejsapi=1`.
// That's the whole integration: no iframe_api script, no player object, no external load.
const EMBED_ORIGIN = "https://www.youtube-nocookie.com";

type Seek = (seconds: number) => void;
const PlayerContext = createContext<Seek | null>(null);

/** Returns a seek function when there's a player on the page, otherwise null. */
export function useSeek() {
  return useContext(PlayerContext);
}

export default function Player({
  youtubeId,
  title,
  children,
}: {
  youtubeId: string;
  title: string;
  children: ReactNode;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const seek = useCallback<Seek>((seconds) => {
    const win = frame.current?.contentWindow;
    if (!win) return;
    const send = (func: string, args: unknown[] = []) =>
      win.postMessage(JSON.stringify({ event: "command", func, args }), EMBED_ORIGIN);
    send("seekTo", [seconds, true]);
    send("playVideo");
    // On a phone the player is above the fold only until you scroll into the questions.
    box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <PlayerContext.Provider value={seek}>
      <div ref={box} className="mb-5 aspect-video w-full overflow-hidden rounded-xl bg-border">
        <iframe
          ref={frame}
          src={`${EMBED_ORIGIN}/embed/${youtubeId}?enablejsapi=1`}
          title={title}
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
      {children}
    </PlayerContext.Provider>
  );
}
