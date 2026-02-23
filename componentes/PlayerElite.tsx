"use client";

import { useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import ReactPlayer from "react-player"; // Certifique-se de ter rodado: npm install react-player

export default function PlayerElite({ aula, currentUser }: { aula: any, currentUser: any }) {
  const supabase = createClientComponentClient();
  const playerRef = useRef<any>(null);
  const [jaAssistiu, setJaAssistiu] = useState(false);
  
  // Chave única para salvar o tempo desta aula específica no celular/PC do usuário
  const memoriaLocalKey = `mascpro_tempo_aula_${aula.id}`;

  useEffect(() => {
    async function verificarBanco() {
      // 1. Verifica no banco se a aula JÁ FOI concluída antes
      const { data } = await supabase
        .from('lesson_progress')
        .select('completed')
        .eq('user_id', currentUser.id)
        .eq('lesson_id', aula.id)
        .single();

      if (data?.completed) setJaAssistiu(true);
    }
    verificarBanco();
  }, [aula.id, currentUser.id]);

  // 2. Quando o vídeo carrega, puxa a memória de onde o aluno parou
  const aoCarregarVideo = () => {
    if (jaAssistiu) return; // Se já viu tudo, começa do zero
    const tempoSalvo = localStorage.getItem(memoriaLocalKey);
    if (tempoSalvo && playerRef.current) {
      playerRef.current.seekTo(parseFloat(tempoSalvo), "seconds");
    }
  };

  // 3. A cada segundo assistido, salva silenciosamente sem travar o sistema
  const aoAssistir = (progresso: any) => {
    if (!jaAssistiu) {
      localStorage.setItem(memoriaLocalKey, progresso.playedSeconds.toString());
    }
  };

  // 4. A MÁGICA FINAL: Vídeo acabou = Salva no banco + Paga Moedas
  const aoTerminar = async () => {
    if (jaAssistiu) return; // Evita pagar moedas em dobro se ele assistir de novo

    console.log("--- INICIANDO TESTE DO BOTÃO ---");
    console.log("👤 Usuário ID:", currentUser?.id);
    console.log("📺 Aula ID:", aula?.id);

    // Passo 1: Verifica se os dados existem
    if (!currentUser?.id || !aula?.id) {
      alert("❌ ERRO: O sistema não sabe quem é o usuário ou qual é a aula!");
      return;
    }

    try {
      // Passo 2: Tenta salvar o vídeo
      console.log("Tentando gravar progresso no banco...");
      const { error: erroProgresso } = await supabase.from('lesson_progress').upsert({
        user_id: currentUser.id,
        lesson_id: aula.id,
        completed: true
      });

      if (erroProgresso) {
        console.error("ERRO PROGRESSO:", erroProgresso);
        alert("❌ O Supabase bloqueou o vídeo: " + erroProgresso.message);
        return; // Para o código aqui se der erro
      }
      console.log("✅ Progresso gravado com sucesso!");

      // Passo 3: Puxa o saldo atual de moedas
      console.log("Buscando moedas atuais...");
      const { data: perfil, error: erroBuscaMoedas } = await supabase
        .from('profiles')
        .select('moedas_pro_acumuladas')
        .eq('id', currentUser.id)
        .single();

      if (erroBuscaMoedas) {
        console.error("ERRO BUSCA MOEDAS:", erroBuscaMoedas);
        alert("❌ Erro ao ler as moedas no banco: " + erroBuscaMoedas.message);
        return;
      }

      const novoSaldo = (perfil?.moedas_pro_acumuladas || 0) + 50;
      console.log("💰 Novo saldo será:", novoSaldo);

      // Passo 4: Tenta injetar o novo saldo
      console.log("Tentando depositar moedas...");
      const { error: erroUpdateMoedas } = await supabase
        .from('profiles')
        .update({ moedas_pro_acumuladas: novoSaldo })
        .eq('id', currentUser.id);

      if (erroUpdateMoedas) {
        console.error("ERRO UPDATE MOEDAS:", erroUpdateMoedas);
        alert("❌ O Supabase bloqueou o pagamento: " + erroUpdateMoedas.message);
        return;
      }

      // Passo Final: Sucesso absoluto
      console.log("✅ TUDO CERTO!");
      
      // Limpa a memória local de tempo, marca como assistido e avisa
      localStorage.removeItem(memoriaLocalKey);
      setJaAssistiu(true);
      alert("🔥 SUCESSO! Aula concluída e 50 Moedas PRO na conta!");
      
      // Aqui você pode chamar a função para liberar a próxima aula visualmente
    } catch (err) {
      console.error("Erro fatal:", err);
      alert("❌ Ocorreu um erro no código. Veja o console (F12).");
    }
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#C9A66B]/20 shadow-2xl">
      <ReactPlayer
        ref={playerRef}
        url={aula.url} // Ex: Link do seu YouTube customizado
        width="100%"
        height="100%"
        controls={true}
        onReady={aoCarregarVideo}
        onProgress={aoAssistir}
        onEnded={aoTerminar}
        config={{ youtube: { playerVars: { showinfo: 0, modestbranding: 1, rel: 0 } } } as any}
          }
        }}
    </div>
  );
}
