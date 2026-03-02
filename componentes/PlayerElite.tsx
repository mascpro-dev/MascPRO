"use client";
import { useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import dynamic from "next/dynamic";

// 👇 A MÁGICA: O "as any" aqui no final obriga o Vercel a aceitar o player sem reclamar das configs
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false }) as any;

export default function PlayerElite({ aula, currentUser }: any) {
  const supabase = createClientComponentClient();
  const playerRef = useRef<any>(null);
  const memoriaLocalKey = `mascpro_tempo_${aula?.id || 'geral'}`;

  // Função: Recupera onde parou (só roda no navegador)
  const aoCarregarVideo = () => {
    if (typeof window !== 'undefined') {
      const tempoSalvo = localStorage.getItem(memoriaLocalKey);
      if (tempoSalvo && playerRef.current) {
        playerRef.current.seekTo(parseFloat(tempoSalvo));
      }
    }
  };

  // Função: Salva o tempo a cada segundo
  const aoAssistir = (progresso: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(memoriaLocalKey, progresso.playedSeconds.toString());
    }
  };

  // Função: Dá as moedas
  const aoTerminar = async () => {
    console.log("--- FIM DA AULA ---");
    if (!currentUser?.id) return;

    try {
      await supabase.from('lesson_progress').upsert({
        user_id: currentUser.id,
        lesson_id: aula.id,
        completed: true
      });

      const { data: perfil } = await supabase
        .from('profiles')
        .select('moedas_pro_acumuladas')
        .eq('id', currentUser.id)
        .single();

      const novoSaldo = (perfil?.moedas_pro_acumuladas || 0) + 50;
      
      await supabase
        .from('profiles')
        .update({ moedas_pro_acumuladas: novoSaldo })
        .eq('id', currentUser.id);

      // Feedback visual opcional (pode remover o alert se preferir)
      // alert("🔥 AULA CONCLUÍDA! +50 MOEDAS PRO!");
    } catch (err) {
      console.error(err);
    }
  };

  // Proteção: Se não tiver vídeo, não mostra nada
  if (!aula?.url) return null;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#C9A66B]/20 shadow-2xl aspect-video bg-black">
      <ReactPlayer
        ref={playerRef}
        url={aula.url}
        width="100%"
        height="100%"
        controls={true}
        onReady={aoCarregarVideo}
        onProgress={aoAssistir}
        onEnded={aoTerminar}
        config={{
          youtube: {
            playerVars: { showinfo: 0, modestbranding: 1, rel: 0 }
          }
        }}
      />
    </div>
  );
}