"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Cidade = { cidade: string; uf: string | null; total: number };
type Parada = {
  id: string;
  crm_lead_id: string;
  nome: string;
  status: string;
  cidade: string | null;
  endereco: string | null;
  bairro: string | null;
};
type Follow = { id: string; nome: string | null; cidade: string | null; quando: string | null; proxima_acao: string | null };

type Dia = {
  data: string;
  usuario: string;
  cidades: Cidade[];
  resumo: {
    planejadas: number;
    realizadas: number;
    pedidos: number;
    valor_confirmado: number;
    valor_distribuidor: number;
    valor_empresa: number;
  };
  proxima: Parada | null;
  followups: Follow[];
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MeuDiaPage() {
  const [cidade, setCidade] = useState("");
  const [dia, setDia] = useState<Dia | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const salva = window.localStorage.getItem("masc_forca_cidade") || "";
    setCidade(salva);
    void carregar(salva);
  }, []);

  async function carregar(nome: string) {
    setLoading(true);
    setErro("");
    const params = nome ? `?cidade=${encodeURIComponent(nome)}` : "";
    const res = await fetch(`/api/vendedor/forca/dia${params}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir o dia.");
    else setDia(d);
    setLoading(false);
  }

  function trocarCidade(nome: string) {
    setCidade(nome);
    window.localStorage.setItem("masc_forca_cidade", nome);
    void carregar(nome);
  }

  if (loading && !dia) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A66B]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]">Força de vendas</p>
        <h1 className="text-2xl font-black">Meu dia</h1>
        <p className="text-sm text-zinc-400">{dia?.usuario}</p>
      </header>

      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cidade</span>
        <select
          value={cidade}
          onChange={(e) => trocarCidade(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
        >
          <option value="">Todas</option>
          {(dia?.cidades || []).map((c) => (
            <option key={c.cidade} value={c.cidade}>
              {c.cidade}{c.uf ? `/${c.uf}` : ""} · {c.total}
            </option>
          ))}
        </select>
      </label>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {dia && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card rotulo="Planejadas" valor={String(dia.resumo.planejadas)} />
            <Card rotulo="Realizadas" valor={String(dia.resumo.realizadas)} />
            <Card rotulo="Pedidos" valor={String(dia.resumo.pedidos)} />
            <Card rotulo="Confirmados" valor={moeda(dia.resumo.valor_confirmado)} />
          </div>
          {(dia.resumo.valor_distribuidor > 0 || dia.resumo.valor_empresa > 0) && (
            <p className="text-xs text-zinc-400">
              Distribuidor {moeda(dia.resumo.valor_distribuidor)} · MASC PRO {moeda(dia.resumo.valor_empresa)}
            </p>
          )}

          <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Próxima visita</p>
            {dia.proxima ? (
              <Link href={`/forca/visita/${dia.proxima.crm_lead_id}`} className="mt-2 block">
                <p className="text-lg font-black">{dia.proxima.nome}</p>
                <p className="text-sm text-zinc-400">
                  {[dia.proxima.endereco, dia.proxima.bairro, dia.proxima.cidade].filter(Boolean).join(" · ")}
                </p>
              </Link>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">Nenhuma parada pendente nesta cidade.</p>
            )}
            <Link href="/forca/rota" className="mt-3 inline-block text-xs font-black uppercase tracking-widest text-[#C9A66B]">
              Montar rota
            </Link>
          </section>

          {dia.followups.length > 0 && (
            <section className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Follow-ups</p>
              {dia.followups.map((f) => (
                <Link key={f.id} href={`/forca/visita/${f.id}`} className="block rounded-xl border border-white/10 px-3 py-3">
                  <p className="font-bold">{f.nome}</p>
                  <p className="text-xs text-zinc-500">{f.cidade} · {f.quando}</p>
                </Link>
              ))}
            </section>
          )}

          <Link href="/forca/instalar" className="block text-center text-xs text-zinc-500">
            Instalar este atalho no celular
          </Link>
        </>
      )}
    </div>
  );
}

function Card({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{rotulo}</p>
      <p className="mt-1 text-xl font-black">{valor}</p>
    </div>
  );
}
