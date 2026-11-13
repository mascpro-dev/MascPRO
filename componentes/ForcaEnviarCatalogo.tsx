"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Send } from "lucide-react";
import { linkCatalogoDistribuidor, montarLinkWhatsApp, normalizarWhatsAppBr } from "@/lib/catalogoVendedor";

export default function ForcaEnviarCatalogo({
  telefone,
  rotulo = "Enviar catálogo",
  classe = "flex w-full items-center justify-center gap-2 rounded-xl border border-[#C9A66B] py-3 text-sm font-black text-[#C9A66B]",
}: {
  telefone?: string | null;
  rotulo?: string;
  classe?: string;
}) {
  const supabase = createClientComponentClient();
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(""), 2500);
    return () => window.clearTimeout(t);
  }, [aviso]);

  async function enviar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, indicado_por")
      .eq("id", session.user.id)
      .maybeSingle();
    const papel = String(profile?.role || "").toUpperCase();
    const ref = papel === "DISTRIBUIDOR"
      ? session.user.id
      : papel === "VENDEDOR"
        ? String(profile?.indicado_por || "")
        : "";
    const link = ref
      ? linkCatalogoDistribuidor(window.location.origin, ref)
      : `${window.location.origin}/catalago`;
    const texto = `Olha o catálogo MASC PRO enquanto eu monto o pedido: ${link}`;
    const numero = normalizarWhatsAppBr(telefone);
    window.open(numero ? montarLinkWhatsApp(numero, texto) : `https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
    setAviso("Catálogo aberto no WhatsApp.");
  }

  return (
    <div className="space-y-1">
      <button type="button" onClick={() => void enviar()} className={classe}>
        <span>{rotulo}</span>
        <Send size={16} className="shrink-0" />
      </button>
      {aviso && <p className="text-center text-xs text-emerald-400">{aviso}</p>}
    </div>
  );
}
