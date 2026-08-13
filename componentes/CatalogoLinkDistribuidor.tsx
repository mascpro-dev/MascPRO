"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Copy, CheckCircle2, Link2, ExternalLink } from "lucide-react";
import { linkCatalogoDistribuidor } from "@/lib/catalogoVendedor";

export default function CatalogoLinkDistribuidor({ compacto = false }: { compacto?: boolean }) {
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("whatsapp, role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (String(profile?.role || "").toUpperCase() === "DISTRIBUIDOR") {
        setWhatsapp(profile?.whatsapp || null);
      }
    }
    void load();
  }, [supabase]);

  if (!userId) return null;

  const link =
    typeof window !== "undefined"
      ? linkCatalogoDistribuidor(window.location.origin, userId)
      : `/catalago?ref=${userId}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* ignora */
    }
  }

  if (compacto) {
    return (
      <button
        type="button"
        onClick={copiar}
        className="flex items-center gap-3 px-4 py-3 text-sm text-[#C9A66B]/80 hover:text-[#C9A66B] hover:bg-[#C9A66B]/5 w-full transition-colors"
      >
        {copiado ? <CheckCircle2 size={18} /> : <Link2 size={18} />}
        <span className="font-bold">{copiado ? "Link copiado!" : "Meu catálogo (WhatsApp)"}</span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[#C9A66B]/20 bg-[#C9A66B]/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 size={16} className="text-[#C9A66B]" />
        <p className="text-xs font-black uppercase tracking-widest text-[#C9A66B]">
          Catálogo com seu WhatsApp
        </p>
      </div>
      <p className="text-[10px] text-zinc-500 leading-relaxed">
        Compartilhe este link. Os pedidos do carrinho chegam no seu WhatsApp com preços padrão do catálogo.
      </p>
      {!whatsapp && (
        <p className="text-[10px] text-amber-500/90">
          Cadastre seu WhatsApp no perfil para receber pedidos pelo link.
        </p>
      )}
      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          className="flex-1 min-w-0 bg-black/40 border border-zinc-800 rounded-lg px-2 py-2 text-[10px] text-zinc-400 font-mono truncate"
        />
        <button
          type="button"
          onClick={copiar}
          className="shrink-0 px-3 py-2 rounded-lg bg-[#C9A66B] text-black hover:bg-[#b08d55] transition-colors"
          title="Copiar link"
        >
          {copiado ? <CheckCircle2 size={14} /> : <Copy size={14} />}
        </button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white"
          title="Abrir catálogo"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
