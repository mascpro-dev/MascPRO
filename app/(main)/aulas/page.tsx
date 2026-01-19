"use client";

import VideoPlayer from "@/componentes/videoplayer"; 
// Certifique-se que o nome do arquivo é videoplayer.tsx (minúsculo) ou VideoPlayer.tsx (maiúsculo)
// Se der erro de import, tente trocar para "@/componentes/VideoPlayer"

export default function AulasPage() {
  return (
    <div className="w-full animate-in fade-in duration-500">
       {/* Renderiza sua estrutura pronta de aulas */}
       <VideoPlayer />
    </div>
  );
}