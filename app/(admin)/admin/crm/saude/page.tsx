"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminSidebar from "@/componentes/AdminSidebar";
import {
  HeartPulse, Loader2, AlertCircle, RefreshCw,
  Package, TrendingUp, Users, CreditCard, DollarSign,
  AlertTriangle, CheckCircle, BarChart3, Boxes,
  ShoppingBag, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

type SaudeData = {
  estoque: {
    total_produtos: number; ativos: number; criticos: number; baixos: number;
    lista: {
      id: string; title: string; stock: number; ativo: boolean;
      price_hairdresser: number; price_ambassador: number; price_distributor: number;
      volume: string | null; risco: string;
    }[];
  };
  curva_abc: {
    resumo: { A: { count: number; receita: number }; B: { count: number; receita: number }; C: { count: number; receita: number } };
    lista: { product_id: string; title: string; qtd: number; receita: number; custo: number; margem_rs: number; margem_pct: number; pct_receita: number; pct_acumulado: number; curva: string }[];
  };
  clientes: { ativos: number; retornando: number; risco: number; perdidos: number; nunca_comprou: number };
  pagamentos: { metodo: string; count: number; total: number }[];
  valores_em_aberto: { total: number; count: number; lista: any[] };
  tendencia: { mes: string; receita: number; pedidos: number }[];
  top_margem: { product_id: string; title: string; qtd: number; receita: number; margem_rs: number; margem_pct: number }[];
  receita_total: number;
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesLabel(m: string) {
  const [ano, mes] = m.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${nomes[parseInt(mes) - 1]}/${ano.slice(2)}`;
}

function pagLabel(m: string) {
  const map: Record<string, string> = {
    mercadopago: "Mercado Pago", pix: "PIX", credito: "Cartão Crédito",
    debito: "Cartão Débito", boleto: "Boleto", pendente: "Pendente",
  };
  return map[m.toLowerCase()] || m;
}

// Barra de progresso simples
function Barra({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SaudeNegocioPage() {
  const [data, setData] = useState<SaudeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [atualizando, setAtualizando] = useState(false);
  const [abaEstoque, setAbaEstoque] = useState<"todos" | "critico" | "baixo" | "ok">("todos");

  async function carregar(silencioso = false) {
    if (!silencioso) setLoading(true); else setAtualizando(true);
    setErro("");
    const res = await fetch("/api/admin/crm/saude", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Falha ao carregar.");
    else setData(d);
    setLoading(false);
    setAtualizando(false);
  }

  useEffect(() => { carregar(); }, []);

  if (loading) return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
      </main>
    </div>
  );

  if (erro || !data) return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="text-red-400 mx-auto mb-3" size={32} />
          <p className="text-red-400 font-bold">{erro}</p>
        </div>
      </main>
    </div>
  );

  const { estoque, curva_abc, clientes, pagamentos, valores_em_aberto, tendencia, top_margem, receita_total } = data;
  const totalClientes = clientes.ativos + clientes.retornando + clientes.risco + clientes.perdidos + clientes.nunca_comprou;
  const maxTendencia = Math.max(...tendencia.map(t => t.receita), 1);
  const produtosFiltrados = abaEstoque === "todos" ? estoque.lista : estoque.lista.filter(p => p.risco === abaEstoque);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <HeartPulse className="text-[#C9A66B]" size={26} />
            <div>
              <h1 className="text-2xl font-black italic uppercase">
                Saúde do <span className="text-[#C9A66B]">Negócio</span>
              </h1>
              <p className="text-zinc-500 text-xs">Estoque · Clientes · Margem · Curva ABC · Pagamentos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => carregar(true)} disabled={atualizando}
              className="flex items-center gap-2 text-[10px] text-zinc-500 hover:text-white font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all disabled:opacity-40">
              <RefreshCw size={12} className={atualizando ? "animate-spin" : ""} /> Atualizar
            </button>
            <Link href="/admin/crm/dashboard"
              className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-[#C9A66B]/50 text-zinc-400 hover:text-[#C9A66B] transition-all">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* ALERTAS CRÍTICOS */}
        {(estoque.criticos > 0 || valores_em_aberto.count > 0) && (
          <div className="flex flex-col gap-3 mb-8">
            {estoque.criticos > 0 && (
              <div className="w-full bg-red-950/30 border border-red-700/40 rounded-2xl px-6 py-4 flex items-center gap-3">
                <AlertTriangle size={18} className="text-red-400 shrink-0" />
                <p className="text-red-300 font-bold text-sm">
                  {estoque.criticos} produto{estoque.criticos > 1 ? "s" : ""} com estoque ZERO — reposição urgente!
                </p>
              </div>
            )}
            {valores_em_aberto.count > 0 && (
              <div className="w-full bg-yellow-950/30 border border-yellow-700/40 rounded-2xl px-6 py-4 flex items-center gap-3">
                <DollarSign size={18} className="text-yellow-400 shrink-0" />
                <p className="text-yellow-300 font-bold text-sm">
                  {moeda(valores_em_aberto.total)} em {valores_em_aberto.count} pedido{valores_em_aberto.count > 1 ? "s" : ""} aguardando pagamento
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── LINHA 1: RESUMO GERAL ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Receita Total Histórica</p>
            <p className="text-2xl font-black text-[#C9A66B] mt-1">{moeda(receita_total)}</p>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Clientes Ativos (30d)</p>
            <p className="text-2xl font-black text-green-400 mt-1">{clientes.ativos}</p>
            <p className="text-[10px] text-zinc-600 mt-1">de {totalClientes} na rede</p>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Estoque Crítico</p>
            <p className={`text-2xl font-black mt-1 ${estoque.criticos > 0 ? "text-red-400" : "text-green-400"}`}>{estoque.criticos}</p>
            <p className="text-[10px] text-zinc-600 mt-1">{estoque.baixos} em nível baixo</p>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Em Aberto</p>
            <p className={`text-2xl font-black mt-1 ${valores_em_aberto.total > 0 ? "text-yellow-400" : "text-zinc-500"}`}>{moeda(valores_em_aberto.total)}</p>
            <p className="text-[10px] text-zinc-600 mt-1">{valores_em_aberto.count} pedidos pendentes</p>
          </div>
        </div>

        {/* ── TENDÊNCIA DE RECEITA ── */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 mb-6">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-5">Tendência de Receita — Últimos 6 Meses</p>
          <div className="flex items-end gap-3 h-28">
            {tendencia.map((t, i) => {
              const h = maxTendencia > 0 ? Math.max(4, Math.round((t.receita / maxTendencia) * 100)) : 4;
              const isUltimo = i === tendencia.length - 1;
              return (
                <div key={t.mes} className="flex-1 flex flex-col items-center gap-1">
                  <p className={`text-[9px] font-black tabular-nums ${isUltimo ? "text-[#C9A66B]" : "text-zinc-600"}`}>
                    {moeda(t.receita).replace("R$\u00a0", "R$")}
                  </p>
                  <div className="w-full flex items-end justify-center" style={{ height: "60px" }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${isUltimo ? "bg-[#C9A66B]" : "bg-zinc-700"}`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <p className={`text-[9px] font-bold ${isUltimo ? "text-[#C9A66B]" : "text-zinc-600"}`}>{mesLabel(t.mes)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SAÚDE DOS CLIENTES ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-blue-400" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Saúde dos Clientes</p>
            </div>
            {[
              { label: "Ativos (≤30 dias)",       value: clientes.ativos,        cor: "bg-green-500",  txt: "text-green-400"  },
              { label: "Retornando (31-90 dias)",  value: clientes.retornando,    cor: "bg-yellow-500", txt: "text-yellow-400" },
              { label: "Em Risco (91-180 dias)",   value: clientes.risco,         cor: "bg-orange-500", txt: "text-orange-400" },
              { label: "Perdidos (180+ dias)",     value: clientes.perdidos,      cor: "bg-red-500",    txt: "text-red-400"    },
              { label: "Nunca compraram",          value: clientes.nunca_comprou, cor: "bg-zinc-600",   txt: "text-zinc-500"   },
            ].map((item) => (
              <div key={item.label} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400">{item.label}</span>
                  <span className={`text-xs font-black ${item.txt}`}>{item.value}</span>
                </div>
                <Barra valor={item.value} max={totalClientes} cor={item.cor} />
              </div>
            ))}
          </div>

          {/* FORMAS DE PAGAMENTO */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={16} className="text-purple-400" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Formas de Pagamento</p>
            </div>
            {pagamentos.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-6">Sem dados.</p>
            ) : (
              pagamentos.map((p) => (
                <div key={p.metodo} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-400">{pagLabel(p.metodo)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-600">{p.count}x</span>
                      <span className="text-xs font-black text-white">{moeda(p.total)}</span>
                    </div>
                  </div>
                  <Barra valor={p.total} max={pagamentos[0]?.total || 1} cor="bg-purple-500" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── CURVA ABC ── */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-[#C9A66B]" />
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Curva ABC de Produtos (Pareto)</p>
          </div>
          <p className="text-[10px] text-zinc-600 mb-5">Curva A = 80% da receita · Curva B = 15% · Curva C = 5%</p>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {(["A","B","C"] as const).map((letra) => {
              const cores: Record<string, string> = { A: "text-green-400 border-green-500/30 bg-green-500/10", B: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10", C: "text-zinc-400 border-zinc-600/30 bg-zinc-600/10" };
              return (
                <div key={letra} className={`rounded-xl border p-4 text-center ${cores[letra]}`}>
                  <p className="text-2xl font-black">Curva {letra}</p>
                  <p className="text-xs font-black mt-1">{curva_abc.resumo[letra].count} produto{curva_abc.resumo[letra].count !== 1 ? "s" : ""}</p>
                  <p className="text-[10px] mt-0.5 opacity-80">{moeda(curva_abc.resumo[letra].receita)}</p>
                </div>
              );
            })}
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] text-zinc-600 font-black uppercase tracking-widest border-b border-zinc-800">
                  <th className="text-left py-2 pr-4">Produto</th>
                  <th className="text-right py-2 px-2">Qtd</th>
                  <th className="text-right py-2 px-2">Receita</th>
                  <th className="text-right py-2 px-2">Margem</th>
                  <th className="text-right py-2 px-2">% Acum.</th>
                  <th className="text-center py-2 pl-2">Curva</th>
                </tr>
              </thead>
              <tbody>
                {curva_abc.lista.map((p) => {
                  const curvaColor: Record<string, string> = { A: "text-green-400 bg-green-500/10", B: "text-yellow-400 bg-yellow-500/10", C: "text-zinc-400 bg-zinc-700/20" };
                  const margemCor = p.margem_pct >= 30 ? "text-green-400" : p.margem_pct >= 15 ? "text-yellow-400" : "text-red-400";
                  return (
                    <tr key={p.product_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-2 pr-4 text-zinc-300 font-medium truncate max-w-[180px]">{p.title}</td>
                      <td className="py-2 px-2 text-right text-zinc-400 tabular-nums">{p.qtd}</td>
                      <td className="py-2 px-2 text-right font-black text-white tabular-nums">{moeda(p.receita)}</td>
                      <td className={`py-2 px-2 text-right font-black tabular-nums ${margemCor}`}>{p.margem_pct}%</td>
                      <td className="py-2 px-2 text-right text-zinc-500 tabular-nums">{p.pct_acumulado}%</td>
                      <td className="py-2 pl-2 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${curvaColor[p.curva]}`}>{p.curva}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── ESTOQUE ── */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Boxes size={16} className="text-blue-400" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Estoque de Produtos</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "todos",   label: `Todos (${estoque.total_produtos})`,     cor: "" },
                { key: "critico", label: `Crítico (${estoque.criticos})`,          cor: "text-red-400 bg-red-500/10 border-red-500/30" },
                { key: "baixo",   label: `Baixo (${estoque.baixos})`,              cor: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
                { key: "ok",      label: `OK`,                                     cor: "text-green-400 bg-green-500/10 border-green-500/30" },
              ].map((f) => (
                <button key={f.key} onClick={() => setAbaEstoque(f.key as any)}
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${abaEstoque === f.key ? (f.cor || "text-white bg-zinc-800 border-zinc-700") : "text-zinc-600 border-zinc-800 hover:border-zinc-700"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] text-zinc-600 font-black uppercase tracking-widest border-b border-zinc-800">
                  <th className="text-left py-2 pr-4">Produto</th>
                  <th className="text-right py-2 px-2">Estoque</th>
                  <th className="text-right py-2 px-2">Preço Dist.</th>
                  <th className="text-right py-2 px-2">Preço Cab.</th>
                  <th className="text-right py-2 px-2">Preço Emb.</th>
                  <th className="text-center py-2 pl-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map((p) => {
                  const RISCO: Record<string, { label: string; cor: string }> = {
                    critico: { label: "ZERO",    cor: "text-red-400 bg-red-500/10"     },
                    baixo:   { label: "BAIXO",   cor: "text-orange-400 bg-orange-500/10" },
                    atencao: { label: "ATENÇÃO", cor: "text-yellow-400 bg-yellow-500/10" },
                    ok:      { label: "OK",      cor: "text-green-400 bg-green-500/10"  },
                  };
                  const r = RISCO[p.risco] || RISCO.ok;
                  return (
                    <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-2 pr-4 text-zinc-300 font-medium">
                        <div>{p.title}</div>
                        {p.volume && <div className="text-[10px] text-zinc-600">{p.volume}</div>}
                      </td>
                      <td className={`py-2 px-2 text-right font-black tabular-nums ${p.stock === 0 ? "text-red-400" : p.stock <= 5 ? "text-orange-400" : "text-white"}`}>{p.stock}</td>
                      <td className="py-2 px-2 text-right text-zinc-400 tabular-nums">{moeda(p.price_distributor)}</td>
                      <td className="py-2 px-2 text-right text-zinc-400 tabular-nums">{moeda(p.price_hairdresser)}</td>
                      <td className="py-2 px-2 text-right text-zinc-400 tabular-nums">{moeda(p.price_ambassador)}</td>
                      <td className="py-2 pl-2 text-center">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${r.cor}`}>{r.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {produtosFiltrados.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-6">Nenhum produto nesta categoria.</p>
            )}
          </div>
        </div>

        {/* ── MELHORES MARGENS ── */}
        {top_margem.length > 0 && (
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-emerald-400" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Top 10 — Melhores Margens</p>
            </div>
            <div className="flex flex-col gap-2">
              {top_margem.map((p, idx) => {
                const margemCor = p.margem_pct >= 40 ? "text-green-400 bg-green-500/10" : p.margem_pct >= 20 ? "text-yellow-400 bg-yellow-500/10" : "text-orange-400 bg-orange-500/10";
                return (
                  <div key={p.product_id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[11px] font-black text-zinc-600 w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-300 truncate">{p.title}</p>
                        <p className="text-[10px] text-zinc-600">{p.qtd} unid. · {moeda(p.receita)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black px-3 py-1 rounded-xl shrink-0 ml-3 ${margemCor}`}>{p.margem_pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VALORES EM ABERTO ── */}
        {valores_em_aberto.count > 0 && (
          <div className="bg-zinc-900/50 border border-yellow-800/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag size={16} className="text-yellow-400" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                Pedidos Aguardando Pagamento — {moeda(valores_em_aberto.total)}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {valores_em_aberto.lista.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div>
                    <p className="text-xs font-bold text-zinc-300">{p.profiles?.full_name || "—"}</p>
                    <p className="text-[10px] text-zinc-600">{new Date(p.created_at).toLocaleDateString("pt-BR")} · {pagLabel(p.payment_method || "")}</p>
                  </div>
                  <span className="text-sm font-black text-yellow-400">{moeda(Number(p.total))}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
