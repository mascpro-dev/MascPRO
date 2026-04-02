"use client";

import Sidebar from "@/componentes/Sidebar";
import { ReactNode, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, usePathname } from "next/navigation";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // LOGICA DE AFILIADO: Captura o ID da URL e salva no navegador
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const refId = params.get("ref");
      
      if (refId) {
        localStorage.setItem("masc_referrer", refId);
        // Limpa a URL para ficar profissional
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    async function checkOnboarding() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();
        
        if (profile && !profile.onboarding_completed && pathname !== "/onboarding") {
          router.push("/onboarding");
        } else {
          setChecking(false);
        }
      } else {
        setChecking(false);
      }
    }
    checkOnboarding();
  }, [supabase, router, pathname]);

  const shell = (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />
      <main className="transition-all duration-300 w-full min-h-screen">
        <div className="pt-20 pb-24 md:pb-20 px-4 md:px-6 md:pt-12 md:pb-12 md:pl-[280px] max-w-[1600px] mx-auto">
          {checking ? (
            <div className="animate-pulse space-y-4 pt-2" aria-busy="true" aria-label="Carregando">
              <div className="h-9 bg-zinc-800 rounded-lg w-2/5 max-w-[220px]" />
              <div className="h-36 bg-zinc-900/80 rounded-2xl border border-white/5" />
              <div className="h-36 bg-zinc-900/80 rounded-2xl border border-white/5" />
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );

  return shell;
}