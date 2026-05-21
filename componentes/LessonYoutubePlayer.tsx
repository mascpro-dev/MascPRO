"use client";

import { useMemo } from "react";
import { Play } from "lucide-react";
import { getLessonVideoId } from "@/lib/youtube";

type Props = {
  lesson: { video_id?: string | null } | null | undefined;
  started: boolean;
  onStart: () => void;
};

/** Player por iframe — confiável em PWA/iOS (API iframe_api falha com CSP e overlay). */
export default function LessonYoutubePlayer({ lesson, started, onStart }: Props) {
  const videoId = getLessonVideoId(lesson);

  const embedSrc = useMemo(() => {
    if (!videoId) return null;
    const origin =
      typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
    const params = new URLSearchParams({
      autoplay: "1",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
      controls: "1",
      enablejsapi: "1",
      origin,
    });
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }, [videoId]);

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
    <iframe
      key={videoId}
      title="Aula em vídeo"
      src={embedSrc!}
      className="absolute inset-0 w-full h-full border-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
