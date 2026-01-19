"use client";

import Sidebar from "@/componentes/Sidebar";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", session.user.id)
            .single();

        // Se não completou onboarding, manda pra lá (evita loop infinito)
        if (profile && !profile.onboarding_completed && pathname !== "/onboarding") {
            router.push("/onboarding");
        } else {
            setChecking(false);
        }
      } else {
        // Se não tem sessão, deixa o middleware cuidar, só libera a tela
        setChecking(false);
      }
    }
    checkOnboarding();
  }, [supabase, router, pathname]);

  // Tela preta enquanto verifica (evita piscar conteúdo proibido)
  if (checking) return <div className="min-h-screen bg-black w-full" />;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#C9A66B] selection:text-black">
      
      {/* O SIDEBAR (Carrega Desktop ou Mobile dependendo da tela) */}
      <Sidebar />

      {/* ÁREA DE CONTEÚDO */}
      {/* md:pl-64 -> Empurra o conteúdo para a direita no PC (para não ficar baixo da barra lateral) */}
      {/* pt-20 pb-28 -> Empurra o conteúdo para baixo/cima no Celular (para não ficar baixo das barras topo/base) */}
      <main className="transition-all duration-300 w-full min-h-screen md:pl-64 pt-20 pb-28 md:pt-0 md:pb-0">
        <div className="max-w-7xl mx-auto p-6 md:p-12">
          {children}
        </div>
      </main>

    </div>
  );
}