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

  if (checking) return <div className="min-h-screen bg-black w-full" />;

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* MENU LATERAL (PC) + BARRAS (MOBILE) */}
      <Sidebar />

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="transition-all duration-300 w-full min-h-screen">
        
        {/* padding-top-20 (80px) -> Para não bater na barra de cima do celular 
            padding-bottom-24 (96px) -> Para não bater na barra de baixo do celular
            md:pl-64 -> Empurra tudo para a direita no PC (por causa do menu lateral)
            md:pt-0 -> No PC não precisa de padding no topo
        */}
        <div className="pt-20 pb-24 px-4 md:px-12 md:pt-12 md:pb-12 md:pl-[280px] max-w-[1600px] mx-auto">
          {children}
        </div>

      </main>
    </div>
  );
}