"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Visita = {
  id: string;
  crm_lead_id: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  cliente_cidade: string | null;
  resultado: string | null;
  notas: string | null;
  data_visita: string;
};

const RESULTADO: Record<string, string> = {
  positivo: "Positivo",
  neutro: "Neutro",
  negativo: "Negativo",
  reagendar: "Reagendar",
};

export default function VisitasPage() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    const res = await fetch("/api/vendedor/forca/painel", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir as visitas.");
    else setVisitas(d.visitas || []);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]">Força de vendas</p>
        <h1 className="text-2xl font-black">Visitas</h1>
        <p className="text-sm text-zinc-400">Inclui visita encerrada sem pedido.</p>
      </header>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#C9A66B]" /></div>
      ) : (
        <div className="space-y-2">
          {visitas.length === 0 && <p className="text-sm text-zinc-500">Nenhuma visita neste mês.</p>}
          {visitas.map((v) => {
            const corpo = (
              <>
                <p className="font-bold">{v.cliente_nome || "Salão"}</p>
                <p className="text-xs text-zinc-500">
                  {[v.cliente_cidade, v.cliente_telefone].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs text-[#C9A66B]">
                  {v.resultado ? RESULTADO[v.resultado] || v.resultado : "Em andamento"}
                  {" · "}
                  {new Date(v.data_visita).toLocaleDateString("pt-BR")}
                </p>
                {v.notas && <p className="mt-1 text-xs text-zinc-400">{v.notas}</p>}
              </>
            );
            return v.crm_lead_id ? (
              <Link key={v.id} href={`/forca/visita/${v.crm_lead_id}`} className="block rounded-xl border border-white/10 px-3 py-3">
                {corpo}
              </Link>
            ) : (
              <article key={v.id} className="rounded-xl border border-white/10 px-3 py-3">{corpo}</article>
            );
          })}
        </div>
      )}
    </div>
  );
}
