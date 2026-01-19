"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RefCapturePage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      localStorage.setItem("masc_referrer", params.id);
      // Redireciona para o registo, evitando a página bloqueada
      router.push("/auth-choice");
    }
  }, [params.id, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#C9A66B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}