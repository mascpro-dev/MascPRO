"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, MapPinned, Sun, Users } from "lucide-react";

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

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?next=/forca");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!["VENDEDOR", "DISTRIBUIDOR", "ADMIN"].includes(String(profile?.role || "").toUpperCase())) {
        router.replace("/home");
        return;
      }
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
        <img src="/logo-masc-branco.png" alt="MASC PRO" className="mb-4 h-9 w-auto" />
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
