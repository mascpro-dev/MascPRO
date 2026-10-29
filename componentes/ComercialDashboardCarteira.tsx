"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PERFIS_COMERCIAIS } from "@/lib/crmCarteira";
import { ORIGENS_LEAD } from "@/lib/comercialClassificacao";

type Payload = {
  ok: boolean;
  error?: string;
  estoque: {
    total: number;
    elegiveis: number;
    sem_responsavel: number;
    nao_abordados: number;
    sem_proxima_acao: number;
    decisores_estoque: number;
  };
  atividade: {
    tentativas: number;
    conversas: number;
    visitas_agendadas: number;
    visitas_realizadas: number;
    propostas: number;
    followups: number;
    atrasados: number;
    trabalhados_periodo: number;
    alcancados: number;
  };
  resultado: {
    clientes_novos: number;
    reativados: number;
    pedidos_pagos: number;
    faturamento: number;
    ticket_medio: number;
    recompras: number;
    conversao: number | null;
    oportunidades_abertas: number;
    conciliacao: number;
  };
  taxas: { contato_efetivo: number | null; cobertura: number | null; comparecimento: number | null };
  metas: { trabalhados: number; decisores: number; visitas: number; clientes_novos: number };
  vendedores: {
    vendedor_id: string;
    vendedor: string;
    carteira: number;
    trabalhados: number;
    decisores: number;
    visitas: number;
    convertidos: number;
    pedidos: number;
    faturamento: number;
    pendencias: number;
  }[];
  cidades: {
    cidade: string;
    uf: string;
    total: number;
    cobertura: number | null;
    decisores: number;
    compradores: number;
    faturamento: number;
    pendencias: number;
  }[];
  filtros: { vendedores: { id: string; full_name: string }[]; cidades: string[]; ufs: string[] };
  definicoes: { termo: string; texto: string }[];
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function num(v: number) {
  return v.toLocaleString("pt-BR");
}
function pct(v: number | null) {
  return v == null ? "—" : `${v}%`;
}

export default function ComercialDashboardCarteira({
  periodo,
  onAbrirCarteira,
}: {
  periodo: string;
  onAbrirCarteira: () => void;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [vendedor, setVendedor] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [perfil, setPerfil] = useState("");
  const [origem, setOrigem] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    const sp = new URLSearchParams({ periodo });
    if (vendedor) sp.set("vendedor", vendedor);
    if (cidade) sp.set("cidade", cidade);
    if (uf) sp.set("uf", uf);
    if (perfil) sp.set("perfil", perfil);
    if (origem) sp.set("origem", origem);
    try {
      const res = await fetch(`/api/admin/comercial/carteira?${sp}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as Payload | null;
      if (!res.ok || !json?.ok) {
        setErro(json?.error || "Falha ao carregar indicadores de carteira.");
        setData(null);
      } else setData(json);
    } catch {
      setErro("Falha ao carregar indicadores de carteira.");
    } finally {
      setLoading(false);
    }
  }, [periodo, vendedor, cidade, uf, perfil, origem]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <select value={vendedor} onChange={(e) => setVendedor(e.target.value)} className="h-10 px-3 rounded-2xl border border-[#E7E1D6] bg-white text-[12px]">
          <option value="">Todos os vendedores</option>
          {(data?.filtros.vendedores || []).map((v) => (
            <option key={v.id} value={v.id}>{v.full_name}</option>
          ))}
        </select>
        <select value={uf} onChange={(e) => { setUf(e.target.value); setCidade(""); }} className="h-10 px-3 rounded-2xl border border-[#E7E1D6] bg-white text-[12px]">
          <option value="">Todos os estados</option>
          {(data?.filtros.ufs || []).map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={cidade} onChange={(e) => setCidade(e.target.value)} className="h-10 px-3 rounded-2xl border border-[#E7E1D6] bg-white text-[12px] max-w-[200px]">
          <option value="">Todas as cidades</option>
          {(data?.filtros.cidades || []).filter((c) => !uf || true).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="h-10 px-3 rounded-2xl border border-[#E7E1D6] bg-white text-[12px]">
          <option value="">Todo perfil</option>
          {PERFIS_COMERCIAIS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="h-10 px-3 rounded-2xl border border-[#E7E1D6] bg-white text-[12px]">
          <option value="">Toda origem</option>
          {ORIGENS_LEAD.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#C9A66B]" /></div>}
      {erro && <p className="text-sm text-[#9A4338]">{erro}</p>}
      {data && !loading && (
        <>
          <section>
            <h2 className="text-[15px] font-semibold">Carteira agora</h2>
            <p className="text-[12px] text-[#8A847A] mb-3">Fotografia de hoje · não usa o mês como denominador</p>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <Card label="Contatos" value={num(data.estoque.total)} />
              <Card label="Elegíveis" value={num(data.estoque.elegiveis)} />
              <Card label="Sem responsável" value={num(data.estoque.sem_responsavel)} />
              <Card label="Não abordados" value={num(data.estoque.nao_abordados)} />
              <Card label="Sem próxima ação" value={num(data.estoque.sem_proxima_acao)} />
              <Card label="Decisores (estoque)" value={num(data.estoque.decisores_estoque)} />
              <Card label="Cobertura" value={pct(data.taxas.cobertura)} sub="trabalhados / elegíveis atribuídos" />
              <Card label="Pendências atrasadas" value={num(data.atividade.atrasados)} />
            </div>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold">Atividade no mês</h2>
            <p className="text-[12px] text-[#8A847A] mb-3">Tentativa e conversa vêm do histórico de atendimento; sem histórico, usa o resultado atual se o contato andou no mês</p>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <Card label="Trabalhados" value={num(data.atividade.trabalhados_periodo)} sub={data.metas.trabalhados ? `meta ${data.metas.trabalhados}` : undefined} />
              <Card label="Tentativas (únicos)" value={num(data.atividade.tentativas)} />
              <Card label="Conversas (únicos)" value={num(data.atividade.conversas)} />
              <Card label="Contato efetivo" value={pct(data.taxas.contato_efetivo)} sub="conversa / tentativa" />
              <Card label="Visitas agendadas" value={num(data.atividade.visitas_agendadas)} />
              <Card label="Visitas realizadas" value={num(data.atividade.visitas_realizadas)} sub={data.metas.visitas ? `meta ${data.metas.visitas}` : undefined} />
              <Card label="Comparecimento" value={pct(data.taxas.comparecimento)} sub="realizadas / agendadas" />
              <Card label="Propostas" value={num(data.atividade.propostas)} />
            </div>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold">Resultado no mês</h2>
            <p className="text-[12px] text-[#8A847A] mb-3">Só pedido pago/separação/despachado/entregue com vínculo ao lead. {data.resultado.conciliacao} pedido(s) pagos sem crm_lead_id (conciliação).</p>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <Card label="Clientes novos" value={num(data.resultado.clientes_novos)} sub={data.metas.clientes_novos ? `meta ${data.metas.clientes_novos}` : undefined} />
              <Card label="Reativados" value={num(data.resultado.reativados)} />
              <Card label="Pedidos pagos" value={num(data.resultado.pedidos_pagos)} />
              <Card label="Faturamento da carteira" value={moeda(data.resultado.faturamento)} />
              <Card label="Ticket médio" value={moeda(data.resultado.ticket_medio)} />
              <Card label="Conversão" value={pct(data.resultado.conversao)} sub="novos / trabalhados elegíveis" />
              <Card label="Oportunidades abertas" value={moeda(data.resultado.oportunidades_abertas)} sub="proposta/negociação · valor estimado" />
              <Card label="Recompras" value={num(data.resultado.recompras)} sub="já tinham pedido pago antes do mês" />
            </div>
          </section>

          <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5 overflow-x-auto">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-[15px] font-semibold">Por vendedor</h2>
                <p className="text-[12px] text-[#8A847A]">Clique no nome para abrir a carteira</p>
              </div>
              <button type="button" onClick={onAbrirCarteira} className="h-9 px-3 rounded-full border border-[#E7E1D6] text-[12px]">Abrir carteiras</button>
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">
                  <th className="pb-2 font-medium">Vendedor</th>
                  <th className="pb-2 font-medium text-right">Carteira</th>
                  <th className="pb-2 font-medium text-right">Trabalhados</th>
                  <th className="pb-2 font-medium text-right">Decisores</th>
                  <th className="pb-2 font-medium text-right">Visitas</th>
                  <th className="pb-2 font-medium text-right">Convertidos</th>
                  <th className="pb-2 font-medium text-right">Pedidos</th>
                  <th className="pb-2 font-medium text-right">Faturamento</th>
                  <th className="pb-2 font-medium text-right">Pendências</th>
                </tr>
              </thead>
              <tbody>
                {data.vendedores.map((v) => (
                  <tr key={v.vendedor_id} className="border-t border-[#F0EBE3]">
                    <td className="py-2">
                      <button type="button" className="hover:underline font-medium" onClick={onAbrirCarteira}>{v.vendedor}</button>
                    </td>
                    <td className="py-2 text-right tabular-nums">{v.carteira}</td>
                    <td className="py-2 text-right tabular-nums">{v.trabalhados}</td>
                    <td className="py-2 text-right tabular-nums">{v.decisores}</td>
                    <td className="py-2 text-right tabular-nums">{v.visitas}</td>
                    <td className="py-2 text-right tabular-nums">{v.convertidos}</td>
                    <td className="py-2 text-right tabular-nums">{v.pedidos}</td>
                    <td className="py-2 text-right tabular-nums">{moeda(v.faturamento)}</td>
                    <td className="py-2 text-right tabular-nums">{v.pendencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5 overflow-x-auto">
            <h2 className="text-[15px] font-semibold">Por cidade</h2>
            <p className="text-[12px] text-[#8A847A] mb-3">Cobertura = elegíveis trabalhados / elegíveis atribuídos na cidade</p>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">
                  <th className="pb-2 font-medium">Cidade</th>
                  <th className="pb-2 font-medium text-right">Contatos</th>
                  <th className="pb-2 font-medium text-right">Cobertura</th>
                  <th className="pb-2 font-medium text-right">Decisores</th>
                  <th className="pb-2 font-medium text-right">Compradores</th>
                  <th className="pb-2 font-medium text-right">Faturamento</th>
                  <th className="pb-2 font-medium text-right">Pendências</th>
                </tr>
              </thead>
              <tbody>
                {data.cidades.map((c) => (
                  <tr key={`${c.cidade}|${c.uf}`} className="border-t border-[#F0EBE3]">
                    <td className="py-2">{c.cidade}{c.uf ? `/${c.uf}` : ""}</td>
                    <td className="py-2 text-right tabular-nums">{c.total}</td>
                    <td className="py-2 text-right tabular-nums">{pct(c.cobertura)}</td>
                    <td className="py-2 text-right tabular-nums">{c.decisores}</td>
                    <td className="py-2 text-right tabular-nums">{c.compradores}</td>
                    <td className="py-2 text-right tabular-nums">{moeda(c.faturamento)}</td>
                    <td className="py-2 text-right tabular-nums">{c.pendencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
            <h2 className="text-[15px] font-semibold mb-3">Como o número da carteira é lido</h2>
            <dl className="space-y-3">
              {data.definicoes.map((d) => (
                <div key={d.termo}>
                  <dt className="text-[13px] font-semibold">{d.termo}</dt>
                  <dd className="text-[13px] text-[#6B6560] mt-0.5">{d.texto}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-[22px] border border-[#E7E1D6] p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">{label}</p>
      <p className="text-[20px] font-semibold mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-[#8A847A] mt-1">{sub}</p>}
    </div>
  );
}
