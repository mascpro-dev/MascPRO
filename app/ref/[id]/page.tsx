"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RefLogicaPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      // Apenas salva o dado na memória do navegador
      localStorage.setItem("masc_referrer", params.id);
      
      // Redireciona para onde o usuário deve ir
      router.push("/auth-choice"); 
    }
  }, [params.id, router]);

  // Retorna uma tela preta vazia com um carregamento centralizado
  // Isso dura menos de 1 segundo e não afeta o resto do app
  return (
    <div style={{ backgroundColor: 'black', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '32px', height: '32px', border: '4px solid #C9A66B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}