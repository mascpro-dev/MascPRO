"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, MapPinned, Sun, Users } from "lucide-react";
import ForcaSincronizador from "@/componentes/ForcaSincronizador";
import { prepararInstalacaoForca } from "@/componentes/ForcaBaixarApp";

const LINKS = [
  { href: "/forca", label: "Meu dia", icon: Sun },
  { href: "/forca/rota", label: "Rota", icon: MapPinned },
  { href: "/forca/clientes", label: "Clientes", icon: Users },
];

export default function ForcaShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [ok, setOk] = useState(false);
  const [nome, setNome] = useState("");

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/forca/entrar");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!["VENDEDOR", "DISTRIBUIDOR", "ADMIN"].includes(String(profile?.role || "").toUpperCase())) {
        router.replace("/home");
        return;
      }
      setNome(String(profile?.full_name || "").trim());
      prepararInstalacaoForca();
      setOk(true);
    }
    void check();
  }, [router, supabase]);

  if (!ok) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-[#C9A66B]" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto w-full max-w-xl px-4 pt-5 pb-28">
        <div className="mb-5 flex items-center gap-4">
          <img src="/logo-masc-branco.png" alt="MASC PRO" className="h-16 w-auto shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C9A66B]">Força de vendas</p>
            <p className="truncate text-xl font-black leading-tight">{nome || "Meu dia"}</p>
          </div>
        </div>
        <ForcaSincronizador />
        {children}
      </main>
      <nav className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-black/95">
        <div className="mx-auto grid max-w-xl grid-cols-3">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const ativo = href === "/forca" ? pathname === "/forca" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-3 text-[10px] font-black uppercase tracking-widest ${
                  ativo ? "text-[#C9A66B]" : "text-zinc-500"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
