"use client";

// CORREÇÃO: Usando chaves { Sidebar } para resolver o erro de "no default export"
import { Sidebar } from "@/componentes/Sidebar"; 
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("id", session.user.id).single();
        if (profile && !profile.onboarding_completed && pathname !== "/onboarding") {
          router.push("/onboarding");
        } else { setChecking(false); }
      } else { setChecking(false); }
    }
    checkOnboarding();
  }, [supabase, router, pathname]);

  if (checking) return <div className="min-h-screen bg-black w-full" />;

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />
      <main className="transition-all duration-300 w-full min-h-screen">
        {/* pt-24 (96px) para o nome 'Olá, Membro Fundador' aparecer livre no mobile */}
        <div className="pt-24 pb-32 px-6 md:pt-12 md:pb-12 md:pl-[280px] max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}