"use client";
import { useCallback, useEffect, useState } from "react";
import ErroComVoltar from "@/componentes/ErroComVoltar";
import PedidoPdfClienteButton from "@/componentes/PedidoPdfClienteButton";
import {
  Users, Loader2, Plus, DollarSign, Percent, CheckCircle2, XCircle,
  Save, RefreshCw, AlertTriangle, MapPin, Target,
} from "lucide-react";

type Vendedor = { id: string; full_name: string; email: string | null; whatsapp: string | null };
type ProdutoPreco = {
  product_id: string;
  title?: string;
  preco_cabeleireiro: number;
  preco_final: number;
  preco_minimo: number;
};
type Faixa = { ordem: number; venda_de: number; venda_ate: number | null; percentual: number };
type Pendente = {
  id: string;
  total: number;
  payment_method: string;
  aprovacao_motivo: string | null;
  vendedor_nome: string;
  created_at: string;
};

type VisitaEquipe = {
  id: string;
  vendedor_nome: string;
  tipo: string;
  cliente_nome: string;
  cliente_cidade: string | null;
  data_visita: string;
  produtos_amostra: string | null;
  resultado: string | null;
};

type EquipeMeta = {
  vendedor_id: string;
  full_name: string;
  meta: { meta_leads: number; meta_visitas: number; meta_conversoes: number; meta_receita: number };
  realizado: { leads: number; visitas: number; conversoes: number; receita: number };
  progresso: { leads: number; visitas: number; conversoes: number; receita: number };
};

const TABS = [
  { id: "vendedores", label: "Vendedores", icon: Users },
  { id: "precos", label: "Tabela de preços", icon: DollarSign },
  { id: "comissao", label: "Comissão faixas", icon: Percent },
  { id: "metas", label: "Metas", icon: Target },
  { id: "visitas", label: "Visitas", icon: MapPin },
  { id: "aprovacoes", label: "Aprovações", icon: CheckCircle2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CrmEquipePage() {
  const [tab, setTab] = useState<TabId>("vendedores");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [produtos, setProdutos] = useState<ProdutoPreco[]>([]);
  const [faixas, setFaixas] = useState<Faixa[]>([]);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [visitas, setVisitas] = useState<VisitaEquipe[]>([]);
  const [resumoVisitas, setResumoVisitas] = useState({ total: 0, demo: 0, amostra: 0 });
  const [equipeMetas, setEquipeMetas] = useState<EquipeMeta[]>([]);
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [metaEdit, setMetaEdit] = useState({
    vendedor_id: "",
    meta_leads: "",
    meta_visitas: "",
    meta_conversoes: "",
    meta_receita: "",
  });
  const [salvandoMeta, setSalvandoMeta] = useState(false);
  const [formVendedor, setFormVendedor] = useState({ nome: "", email: "", whatsapp: "" });
  const [criando, setCriando] = useState(false);
  const [msg, setMsg] = useState("");
  const [salvandoPrecos, setSalvandoPrecos] = useState(false);
  const [salvandoFaixas, setSalvandoFaixas] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const [v, p, f, a, vis, met] = await Promise.all([
        fetch("/api/admin/crm/equipe/vendedores", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/crm/equipe/tabela-precos", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/crm/equipe/comissao-faixas", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/crm/equipe/aprovacoes", { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/crm/equipe/visitas?periodo=${periodo}${filtroVendedor ? `&vendedor_id=${filtroVendedor}` : ""}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/crm/equipe/metas?periodo=${periodo}`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (!v?.ok) throw new Error(v?.error || "Falha vendedores");
      setVendedores(v.vendedores || []);
      if (p?.ok) setProdutos(p.produtos || []);
      if (f?.ok) setFaixas(f.faixas || []);
      if (a?.ok) setPendentes(a.pendentes || []);
      if (vis?.ok) {
        setVisitas(vis.visitas || []);
        setResumoVisitas(vis.resumo || { total: 0, demo: 0, amostra: 0 });
      }
      if (met?.ok) setEquipeMetas(met.equipe || []);
    } catch (e: any) {
      setErro(e.message || "Erro ao carregar equipe.");
    }
    setLoading(false);
  }, [periodo, filtroVendedor]);

  useEffect(() => { void carregar(); }, [carregar]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") as TabId;
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, []);

  async function criarVendedor() {
    setCriando(true);
    setMsg("");
    const res = await fetch("/api/admin/crm/equipe/vendedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formVendedor),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) {
      setMsg(d?.error || "Erro ao cadastrar.");
    } else {
      setMsg(`Vendedor criado! Senha temporária: ${d.vendedor.senha_temporaria}`);
      setFormVendedor({ nome: "", email: "", whatsapp: "" });
      void carregar();
    }
    setCriando(false);
  }

  async function salvarPrecos() {
    setSalvandoPrecos(true);
    const res = await fetch("/api/admin/crm/equipe/tabela-precos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itens: produtos.map((p) => ({
          product_id: p.product_id,
          preco_final: p.preco_final,
          preco_minimo: p.preco_minimo,
        })),
      }),
    });
    const d = await res.json().catch(() => null);
    setMsg(d?.ok ? "Tabela de preços salva." : d?.error || "Erro ao salvar preços.");
    setSalvandoPrecos(false);
  }

  async function salvarFaixas() {
    setSalvandoFaixas(true);
    const res = await fetch("/api/admin/crm/equipe/comissao-faixas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faixas }),
    });
    const d = await res.json().catch(() => null);
    setMsg(d?.ok ? "Faixas de comissão salvas." : d?.error || "Erro.");
    setSalvandoFaixas(false);
  }

  async function salvarMetaVendedor() {
    if (!metaEdit.vendedor_id) {
      setMsg("Selecione um vendedor.");
      return;
    }
    setSalvandoMeta(true);
    const res = await fetch("/api/admin/crm/equipe/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendedor_id: metaEdit.vendedor_id,
        periodo,
        meta_leads: Number(metaEdit.meta_leads || 0),
        meta_visitas: Number(metaEdit.meta_visitas || 0),
        meta_conversoes: Number(metaEdit.meta_conversoes || 0),
        meta_receita: Number(String(metaEdit.meta_receita).replace(",", ".") || 0),
      }),
    });
    const d = await res.json().catch(() => null);
    setMsg(d?.ok ? "Meta salva!" : d?.error || "Erro.");
    if (d?.ok) void carregar();
    setSalvandoMeta(false);
  }

  async function aprovar(orderId: string, acao: "aprovar" | "rejeitar") {
    const res = await fetch("/api/admin/crm/equipe/aprovacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, acao, confirmar_pagamento: acao === "aprovar" }),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) void carregar();
    else setMsg(d?.error || "Erro na aprovação.");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
      </div>
    );
  }

  if (erro) {
    return <ErroComVoltar mensagem={erro} onVoltar={() => window.history.back()} rotuloVoltar="CRM" />;
  }

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]">Equipe comercial</p>
          <h1 className="text-2xl font-black text-white">Vendedores</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Base cabeleireiro · faixa mín/máx · aprovação de descontos · consignado fora de meta
          </p>
        </div>
        <button type="button" onClick={() => void carregar()} className="flex items-center gap-2 text-xs text-zinc-400 border border-zinc-700 px-3 py-2 rounded-xl">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {msg && (
        <div className="text-sm bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-300">{msg}</div>
      )}

      {pendentes.length > 0 && tab !== "aprovacoes" && (
        <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={16} />
          {pendentes.length} pedido(s) aguardando sua aprovação.
          <button type="button" onClick={() => setTab("aprovacoes")} className="underline font-bold ml-1">Ver</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
              tab === id ? "bg-[#C9A66B]/15 text-[#C9A66B] border border-[#C9A66B]/30" : "text-zinc-500"
            }`}
          >
            <Icon size={14} />
            {label}
            {id === "aprovacoes" && pendentes.length > 0 && (
              <span className="bg-amber-500 text-black rounded-full px-1.5 text-[10px]">{pendentes.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "vendedores" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-black uppercase text-zinc-500">Cadastrar vendedor</h2>
            <input placeholder="Nome" value={formVendedor.nome} onChange={(e) => setFormVendedor((f) => ({ ...f, nome: e.target.value }))} className={inputClass} />
            <input placeholder="E-mail" value={formVendedor.email} onChange={(e) => setFormVendedor((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
            <input placeholder="WhatsApp" value={formVendedor.whatsapp} onChange={(e) => setFormVendedor((f) => ({ ...f, whatsapp: e.target.value }))} className={inputClass} />
            <button type="button" disabled={criando} onClick={criarVendedor} className="w-full bg-[#C9A66B] text-black font-black uppercase text-xs py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {criando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Criar vendedor
            </button>
            <p className="text-[10px] text-zinc-600">Senha padrão enviada na resposta (1234567890). Vendedor acessa CRM em /vendedor/crm.</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-xs font-black uppercase text-zinc-500 mb-4">Equipe ({vendedores.length})</h2>
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {vendedores.map((v) => (
                <li key={v.id} className="flex justify-between items-center border-b border-zinc-800/50 pb-2 text-sm">
                  <span className="text-white font-medium">{v.full_name}</span>
                  <span className="text-zinc-500 text-xs">{v.email}</span>
                </li>
              ))}
              {!vendedores.length && <li className="text-zinc-600 text-sm">Nenhum vendedor cadastrado.</li>}
            </ul>
          </div>
        </div>
      )}

      {tab === "precos" && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">
            Referência: preço cabeleireiro. Defina o <strong className="text-zinc-300">preço final</strong> (teto) e o <strong className="text-zinc-300">mínimo praticado</strong> que o vendedor pode usar sem aprovação.
          </p>
          <div className="overflow-x-auto border border-zinc-800 rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase text-zinc-500 border-b border-zinc-800">
                  <th className="text-left p-3">Produto</th>
                  <th className="text-right p-3">Cabeleireiro</th>
                  <th className="text-right p-3">Preço final</th>
                  <th className="text-right p-3">Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((p, idx) => (
                  <tr key={p.product_id} className="border-b border-zinc-800/50">
                    <td className="p-3 text-zinc-300">{p.title}</td>
                    <td className="p-3 text-right text-zinc-500">{moeda(p.preco_cabeleireiro)}</td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={p.preco_final}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setProdutos((arr) => arr.map((x, i) => (i === idx ? { ...x, preco_final: v } : x)));
                        }}
                        className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-right text-white"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={p.preco_minimo}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setProdutos((arr) => arr.map((x, i) => (i === idx ? { ...x, preco_minimo: v } : x)));
                        }}
                        className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-right text-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" disabled={salvandoPrecos} onClick={salvarPrecos} className="bg-[#C9A66B] text-black font-black uppercase text-xs px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50">
            {salvandoPrecos ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar tabela
          </button>
        </div>
      )}

      {tab === "comissao" && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">Comissão crescente conforme vendas do vendedor no mês (exclui consignado).</p>
          {faixas.map((f, idx) => (
            <div key={f.ordem} className="grid grid-cols-4 gap-3 items-end bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase">De R$</label>
                <input type="number" value={f.venda_de} onChange={(e) => setFaixas((arr) => arr.map((x, i) => i === idx ? { ...x, venda_de: Number(e.target.value) } : x))} className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase">Até R$</label>
                <input type="number" value={f.venda_ate ?? ""} placeholder="∞" onChange={(e) => setFaixas((arr) => arr.map((x, i) => i === idx ? { ...x, venda_ate: e.target.value ? Number(e.target.value) : null } : x))} className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase">%</label>
                <input type="number" value={f.percentual} onChange={(e) => setFaixas((arr) => arr.map((x, i) => i === idx ? { ...x, percentual: Number(e.target.value) } : x))} className={inputClass} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setFaixas((arr) => [...arr, { ordem: arr.length, venda_de: 0, venda_ate: null, percentual: 10 }])} className="text-xs text-[#C9A66B] font-bold uppercase">
            + Adicionar faixa
          </button>
          <button type="button" disabled={salvandoFaixas} onClick={salvarFaixas} className="block bg-[#C9A66B] text-black font-black uppercase text-xs px-6 py-3 rounded-xl">
            {salvandoFaixas ? "Salvando..." : "Salvar comissões"}
          </button>
        </div>
      )}

      {tab === "metas" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-black uppercase text-zinc-500">Definir meta individual</h2>
              <select value={metaEdit.vendedor_id} onChange={(e) => setMetaEdit((m) => ({ ...m, vendedor_id: e.target.value }))} className={inputClass}>
                <option value="">Vendedor...</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.full_name}</option>
                ))}
              </select>
              <input placeholder="Meta leads" type="number" value={metaEdit.meta_leads} onChange={(e) => setMetaEdit((m) => ({ ...m, meta_leads: e.target.value }))} className={inputClass} />
              <input placeholder="Meta visitas" type="number" value={metaEdit.meta_visitas} onChange={(e) => setMetaEdit((m) => ({ ...m, meta_visitas: e.target.value }))} className={inputClass} />
              <input placeholder="Meta conversões" type="number" value={metaEdit.meta_conversoes} onChange={(e) => setMetaEdit((m) => ({ ...m, meta_conversoes: e.target.value }))} className={inputClass} />
              <input placeholder="Meta receita R$" value={metaEdit.meta_receita} onChange={(e) => setMetaEdit((m) => ({ ...m, meta_receita: e.target.value }))} className={inputClass} />
              <button type="button" disabled={salvandoMeta} onClick={salvarMetaVendedor} className="w-full bg-[#C9A66B] text-black font-black uppercase text-xs py-3 rounded-xl disabled:opacity-50">
                {salvandoMeta ? "Salvando..." : "Salvar meta"}
              </button>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 overflow-x-auto">
              <h2 className="text-xs font-black uppercase text-zinc-500 mb-3">Progresso da equipe</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-zinc-500 uppercase">
                    <th className="text-left p-2">Vendedor</th>
                    <th className="text-right p-2">Visitas</th>
                    <th className="text-right p-2">Receita</th>
                    <th className="text-right p-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {equipeMetas.map((e) => (
                    <tr key={e.vendedor_id} className="border-t border-zinc-800/50">
                      <td className="p-2 text-zinc-300">{e.full_name}</td>
                      <td className="p-2 text-right">{e.realizado.visitas}/{e.meta.meta_visitas || "—"}</td>
                      <td className="p-2 text-right">{moeda(e.realizado.receita)}</td>
                      <td className="p-2 text-right text-[#C9A66B]">{e.progresso.receita}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "visitas" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" />
            <select value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white">
              <option value="">Todos vendedores</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.full_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black">{resumoVisitas.total}</p>
              <p className="text-[10px] text-zinc-500 uppercase">Total visitas</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black">{resumoVisitas.demo}</p>
              <p className="text-[10px] text-zinc-500 uppercase">Demos</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black">{resumoVisitas.amostra}</p>
              <p className="text-[10px] text-zinc-500 uppercase">Amostras</p>
            </div>
          </div>
          <ul className="space-y-2 max-h-[480px] overflow-y-auto">
            {visitas.map((v) => (
              <li key={v.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold text-white">{v.cliente_nome}</span>
                  <span className="text-[10px] text-zinc-600">{new Date(v.data_visita).toLocaleDateString("pt-BR")}</span>
                </div>
                <p className="text-[10px] text-[#C9A66B] uppercase mt-1">{v.vendedor_nome} · {v.tipo}</p>
                {v.produtos_amostra && <p className="text-xs text-zinc-500 mt-1">{v.produtos_amostra}</p>}
                {v.resultado && <p className="text-xs text-zinc-400">Resultado: {v.resultado}</p>}
              </li>
            ))}
            {!visitas.length && <li className="text-zinc-600 text-sm">Nenhuma visita no período.</li>}
          </ul>
        </div>
      )}

      {tab === "aprovacoes" && (
        <ul className="space-y-3">
          {pendentes.map((p) => (
            <li key={p.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-wrap justify-between gap-3 items-center">
              <div>
                <p className="font-mono text-sm text-white">#{p.id.slice(0, 8)} · {moeda(Number(p.total))}</p>
                <p className="text-xs text-zinc-500">{p.vendedor_nome} · {p.payment_method}</p>
                {p.aprovacao_motivo && <p className="text-xs text-amber-400 mt-1">{p.aprovacao_motivo}</p>}
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <PedidoPdfClienteButton orderId={p.id} compacto />
                <button type="button" onClick={() => aprovar(p.id, "aprovar")} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase">
                  <CheckCircle2 size={14} /> Aprovar
                </button>
                <button type="button" onClick={() => aprovar(p.id, "rejeitar")} className="flex items-center gap-1 px-4 py-2 bg-red-600/80 text-white rounded-xl text-xs font-black uppercase">
                  <XCircle size={14} /> Rejeitar
                </button>
              </div>
            </li>
          ))}
          {!pendentes.length && <li className="text-zinc-600 text-sm">Nenhum pedido pendente.</li>}
        </ul>
      )}
    </div>
  );
}
