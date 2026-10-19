"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { getLessonVideoId } from "@/lib/youtube";

function comandoPlayer(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func, args }),
    "*"
  );
}

type Props = {
  lesson: { video_id?: string | null } | null | undefined;
  started: boolean;
  onStart: () => void;
};

/** Player por iframe — confiável em PWA/iOS (API iframe_api falha com CSP e overlay). */
export default function LessonYoutubePlayer({ lesson, started, onStart }: Props) {
  const videoId = getLessonVideoId(lesson);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [encerrado, setEncerrado] = useState(false);

  const embedSrc = useMemo(() => {
    if (!videoId) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({
      autoplay: "1",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
      iv_load_policy: "3",
      controls: "1",
      disablekb: "1",
      fs: "1",
      enablejsapi: "1",
      origin,
    });
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }, [videoId]);

  useEffect(() => {
    setEncerrado(false);
  }, [videoId]);

  useEffect(() => {
    if (!started) return;

    function aoMensagem(event: MessageEvent) {
      const origem = String(event.origin || "");
      if (!origem.includes("youtube.com") && !origem.includes("youtube-nocookie.com")) return;
      let data = event.data as { event?: string; info?: number | { playerState?: number } };
      if (typeof event.data === "string") {
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
      }
      const estado = data?.event === "onStateChange"
        ? data.info
        : data?.info && typeof data.info === "object"
          ? data.info.playerState
          : undefined;
      if (estado === 0) setEncerrado(true);
      if (estado === 1) setEncerrado(false);
    }

    window.addEventListener("message", aoMensagem);
    return () => window.removeEventListener("message", aoMensagem);
  }, [started, videoId]);

  function inscreverPlayer() {
    const frame = iframeRef.current;
    const win = frame?.contentWindow;
    if (!win) return;
    win.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*");
    comandoPlayer(frame, "addEventListener", ["onStateChange"]);
  }

  function rever() {
    const frame = iframeRef.current;
    setEncerrado(false);
    comandoPlayer(frame, "seekTo", [0, true]);
    comandoPlayer(frame, "playVideo", []);
  }

  if (!videoId) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center p-6 text-center text-zinc-500 text-sm">
        Esta aula não tem vídeo cadastrado.
      </div>
    );
  }

  if (!started) {
    return (
      <button
        type="button"
        onClick={onStart}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center"
        aria-label="Reproduzir aula"
      >
        <img
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          onError={(e) => {
            e.currentTarget.src = `https://i.ytimg.com/vi/${videoId}/default.jpg`;
          }}
        />
        <div className="w-16 h-16 bg-[#C9A66B] rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 relative z-10">
          <Play size={24} className="text-black ml-1 fill-black" />
        </div>
      </button>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <iframe
        ref={iframeRef}
        key={videoId}
        title="Aula em vídeo"
        src={embedSrc!}
        className="absolute left-0 w-full border-0"
        style={{ top: "-64px", height: "calc(100% + 64px + 52px)" }}
        onLoad={inscreverPlayer}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {encerrado && (
        <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-white text-sm font-semibold uppercase tracking-[0.2em]">Aula encerrada</p>
          <button
            type="button"
            onClick={rever}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A66B] text-black text-[10px] font-black uppercase tracking-widest"
          >
            <RotateCcw size={14} />
            Assistir de novo
          </button>
        </div>
      )}
    </div>
  );
}
