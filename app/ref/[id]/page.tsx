"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RefCapturePage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      // Salva o ID de quem indicou no navegador do convidado
      localStorage.setItem("masc_referrer", params.id);
      
      // Manda o usuário para a sua página de cadastro existente
      router.push("/auth-choice"); 
    }
  }, [params.id, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#C9A66B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}