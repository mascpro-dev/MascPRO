// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import dynamic from "next/dynamic";

// 👇 VOLTAMOS PARA O PADRÃO (Isso corrige o erro de módulo não encontrado)
const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

export default function PlayerElite({ aula, currentUser }) {
  const supabase = createClientComponentClient();
  const playerRef = useRef(null);
  const [montado, setMontado] = useState(false);
  const memoriaLocalKey = `mascpro_tempo_${aula?.id || 'geral'}`;

  // Garante que só roda no navegador
  useEffect(() => {
    setMontado(true);
  }, []);

  const aoCarregarVideo = () => {
    if (typeof window !== 'undefined') {
      const tempoSalvo = localStorage.getItem(memoriaLocalKey);
      if (tempoSalvo && playerRef.current) {
        playerRef.current.seekTo(parseFloat(tempoSalvo));
      }
    }
  };

  const aoAssistir = (progresso) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(memoriaLocalKey, progresso.playedSeconds.toString());
    }
  };

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
        .select('personal_coins')
        .eq('id', currentUser.id)
        .single();

      const novoSaldo = (perfil?.personal_coins || 0) + 50;
      
      await supabase
        .from('profiles')
        .update({ personal_coins: novoSaldo })
        .eq('id', currentUser.id);

    } catch (err) {
      console.error(err);
    }
  };

  // Se não montou ou não tem aula, não mostra nada
  if (!montado) return null;
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