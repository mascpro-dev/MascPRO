"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Metas = {
  meta: { meta_leads: number; meta_visitas: number; meta_conversoes: number; meta_receita: number };
  realizado: { leads: number; visitas: number; conversoes: number; receita: number };
  progresso: { leads: number; visitas: number; conversoes: number; receita: number };
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MetasPage() {
  const [metas, setMetas] = useState<Metas | null>(null);
  const [papel, setPapel] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    const res = await fetch("/api/vendedor/forca/painel", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir as metas.");
    else {
      setMetas(d.metas || null);
      setPapel(d.papel || "");
    }
    setLoading(false);
  }

  const linhas = metas
    ? [
        { nome: "Visitas", pct: metas.progresso.visitas, feito: String(metas.realizado.visitas), alvo: String(metas.meta.meta_visitas) },
        { nome: "Clientes", pct: metas.progresso.leads, feito: String(metas.realizado.leads), alvo: String(metas.meta.meta_leads) },
        { nome: "Fechados", pct: metas.progresso.conversoes, feito: String(metas.realizado.conversoes), alvo: String(metas.meta.meta_conversoes) },
        { nome: "Receita", pct: metas.progresso.receita, feito: moeda(metas.realizado.receita), alvo: moeda(metas.meta.meta_receita) },
      ]
    : [];

  return (
    <div className="space-y-4">
      <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#C9A66B]" /></div>
      ) : !metas ? (
        <p className="text-sm text-zinc-400">
          {papel === "VENDEDOR"
            ? "Ainda não há meta neste mês."
            : "A meta é por vendedor e aparece no celular dele. O painel da região está em Painel."}
        </p>
      ) : (
        <div className="space-y-3">
          {linhas.map((item) => (
            <article key={item.nome} className="rounded-xl border border-white/10 px-3 py-3">
              <div className="flex items-center justify-between text-sm">
                <p className="font-bold">{item.nome}</p>
                <p className="font-black text-[#C9A66B]">{item.pct}%</p>
              </div>
              <p className="text-xs text-zinc-500">{item.feito} de {item.alvo}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full bg-[#C9A66B]" style={{ width: `${Math.min(item.pct, 100)}%` }} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
