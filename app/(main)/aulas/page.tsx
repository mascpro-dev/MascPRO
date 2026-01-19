"use client";

// CORREÇÃO AQUI: Trocamos "videoplayer" por "VideoPlayer" (Maiúsculas importam!)
// Se o seu arquivo for "videoplayer.tsx" (tudo minúsculo), mude de volta aqui.
import VideoPlayer from "@/componentes/VideoPlayer"; 

export default function AulasPage() {
  return (
    <div className="w-full animate-in fade-in duration-500">
       {/* Aqui ele carrega o seu componente de vídeo que já existe */}
       <VideoPlayer />
    </div>
  );
}