"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { pagamentoLabelPedido } from "@/lib/pedidoPdfCliente";

type Resumo = {
  visitas: number;
  pedidos: number;
  pedidos_confirmados: number;
  receita: number;
  clientes: number;
};
type Ponto = { dia: string; valor: number };
type Forma = { forma: string; valor: number };
type Metas = {
  meta: { meta_receita: number; meta_visitas: number };
  realizado: { receita: number; visitas: number };
  progresso: { receita: number; visitas: number };
} | null;

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diaCurto(dia: string) {
  const [, mes, d] = dia.split("-");
  return `${d}/${mes}`;
}

export default function PainelPage() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [serie, setSerie] = useState<Ponto[]>([]);
  const [formas, setFormas] = useState<Forma[]>([]);
  const [metas, setMetas] = useState<Metas>(null);
  const [periodo, setPeriodo] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/vendedor/forca/painel", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir o painel.");
    else {
      setResumo(d.resumo);
      setSerie(d.serie || []);
      setFormas(d.formas || []);
      setMetas(d.metas || null);
      setPeriodo(d.periodo || "");
    }
    setLoading(false);
  }

  const ticket = resumo && resumo.pedidos_confirmados > 0 ? resumo.receita / resumo.pedidos_confirmados : 0;
  const topo = Math.max(...serie.map((p) => p.valor), 1);
  const topoForma = Math.max(...formas.map((f) => f.valor), 1);

  return (
    <div className="space-y-4">
      <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]">Força de vendas</p>
        <h1 className="text-2xl font-black">Painel</h1>
        <p className="text-sm text-zinc-400">Vendas de {periodo}</p>
      </header>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#C9A66B]" /></div>
      ) : resumo && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Card rotulo="Venda" valor={moeda(resumo.receita)} destaque />
            <Card rotulo="Pedidos" valor={String(resumo.pedidos_confirmados)} />
            <Card rotulo="Ticket médio" valor={moeda(ticket)} />
            <Card rotulo="Visitas" valor={String(resumo.visitas)} />
          </div>

          {(metas?.meta.meta_receita || 0) > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <Medidor rotulo="Meta de venda" pct={metas?.progresso.receita || 0} />
              <Medidor rotulo="Meta de visitas" pct={metas?.progresso.visitas || 0} />
            </div>
          )}

          <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Vendas do mês</p>
            {serie.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">Ainda não há venda confirmada neste mês.</p>
            ) : (
              <div className="mt-4 flex h-36 items-end gap-1">
                {serie.map((ponto) => (
                  <div key={ponto.dia} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-[#3B82F6]"
                      style={{ height: `${Math.max(8, (ponto.valor / topo) * 112)}px` }}
                      title={moeda(ponto.valor)}
                    />
                    <span className="text-[9px] text-zinc-500">{diaCurto(ponto.dia)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Formas de pagamento</p>
            <div className="mt-3 space-y-2">
              {formas.length === 0 && <p className="text-sm text-zinc-500">Sem pagamento confirmado.</p>}
              {formas.map((forma) => (
                <div key={forma.forma}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span>{pagamentoLabelPedido(forma.forma)}</span>
                    <span className="font-bold">{moeda(forma.valor)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded bg-zinc-800">
                    <div className="h-full bg-[#C9A66B]" style={{ width: `${(forma.valor / topoForma) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Card({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-3 ${destaque ? "bg-[#2563EB]" : "border border-white/10 bg-zinc-900"}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{rotulo}</p>
      <p className="mt-1 text-xl font-black">{valor}</p>
    </div>
  );
}

function Medidor({ rotulo, pct }: { rotulo: string; pct: number }) {
  const limitado = Math.max(0, Math.min(pct, 100));
  const giro = 251.2;
  const cheio = (limitado / 100) * giro;
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{rotulo}</p>
      <svg viewBox="0 0 120 80" className="mx-auto mt-1 h-20 w-full">
        <path d="M15 70 A45 45 0 1 1 105 70" fill="none" stroke="#3f3f46" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M15 70 A45 45 0 1 1 105 70"
          fill="none"
          stroke="#22c55e"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${cheio} ${giro}`}
        />
        <text x="60" y="62" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">{limitado}%</text>
      </svg>
    </div>
  );
}
