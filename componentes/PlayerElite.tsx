"use client";
import { useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import dynamic from "next/dynamic";

// 👇 O SEGREDO: Carrega o player só no navegador e evita o erro do Vercel
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

export default function PlayerElite({ aula, currentUser }: any) {
  const supabase = createClientComponentClient();
  const playerRef = useRef<any>(null);
  const [jaAssistiu, setJaAssistiu] = useState(false);
  const memoriaLocalKey = `mascpro_tempo_${aula?.id || 'geral'}`;

  // Função: Recupera onde parou
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

  // Função: Dá as moedas e salva com a API do Banco (Seguro)
  const aoTerminar = async () => {
    console.log("--- FIM DA AULA DETECTADO ---");
    if (!currentUser?.id) return;

    try {
      // 1. Salva Progresso
      await supabase.from('lesson_progress').upsert({
        user_id: currentUser.id,
        lesson_id: aula.id, // Ou aula.code dependendo do seu banco
        completed: true
      });

      // 2. Dá Moedas
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

      alert("🔥 AULA CONCLUÍDA! +50 MOEDAS PRO!");
    } catch (err) {
      console.error("Erro silencioso ao salvar:", err);
    }
  };

  // Se não tiver URL, não mostra nada para não quebrar
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