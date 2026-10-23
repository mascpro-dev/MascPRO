"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import { Boxes, Loader2, Save, AlertCircle, CheckCircle } from "lucide-react";

type Item = {
  id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  custo_unitario: number;
  valor_total: number;
};

type Pedido = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  itens: { title: string; quantidade: number; preco_unitario: number; valor: number }[];
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function EstoqueDistribuidorPage() {
  const [role, setRole] = useState<"" | "ADMIN" | "DISTRIBUIDOR">("");
  const [distribuidores, setDistribuidores] = useState<{ id: string; full_name: string | null }[]>([]);
  const [pid, setPid] = useState("");
  const [nome, setNome] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [edits, setEdits] = useState<Record<string, { quantity: string; custo: string }>>({});
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [grupoRyo, setGrupoRyo] = useState(false);
  const [valorEstoque, setValorEstoque] = useState(0);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  const carregar = useCallback(async (profissionalId?: string) => {
    setLoading(true);
    setErro("");
    setOk("");
    const q = profissionalId ? `?profissional_id=${encodeURIComponent(profissionalId)}` : "";
    const res = await fetch(`/api/admin/crm/estoque${q}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) {
      setErro(d?.error || "Falha ao carregar estoque.");
      setLoading(false);
      return;
    }
    setRole(d.role);
    setDistribuidores(d.distribuidores || []);
    setNome(d.profissional?.full_name || "");
    if (d.role === "ADMIN" && d.profissional?.id) setPid(d.profissional.id);
    setGrupoRyo(!!d.grupo_ryo);
    setItens(d.itens || []);
    setValorEstoque(Number(d.valor_estoque || 0));
    setPedido(d.pedido || null);
    if (d.aviso_ryo) setOk(d.aviso_ryo);
    const next: Record<string, { quantity: string; custo: string }> = {};
    for (const it of d.itens || []) {
      next[it.id] = {
        quantity: String(it.quantity),
        custo: String(it.custo_unitario ?? 0),
      };
    }
    setEdits(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const sujo = useMemo(() => {
    return itens.some((it) => {
      const e = edits[it.id];
      if (!e) return false;
      return Number(e.quantity) !== Number(it.quantity) || Number(e.custo) !== Number(it.custo_unitario);
    });
  }, [itens, edits]);

  async function salvarContagem() {
    setSalvando(true);
    setErro("");
    setOk("");
    const payload = {
      profissional_id: role === "ADMIN" ? pid : undefined,
      itens: itens.map((it) => ({
        id: it.id,
        quantity: Number(edits[it.id]?.quantity ?? it.quantity),
        custo_unitario: Number(edits[it.id]?.custo ?? it.custo_unitario),
      })),
    };
    const res = await fetch("/api/admin/crm/estoque", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) {
      setErro(d?.error || "Não foi possível salvar a contagem.");
      setSalvando(false);
      return;
    }
    setOk(`Contagem salva (${d.alterados} item${d.alterados === 1 ? "" : "s"}).`);
    setSalvando(false);
    await carregar(role === "ADMIN" ? pid : undefined);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Boxes className="text-[#C9A66B]" size={24} />
          <div>
            <h1 className="text-2xl font-black italic uppercase">
              Contagem de <span className="text-[#C9A66B]">Estoque</span>
            </h1>
            <p className="text-zinc-500 text-xs">
              Conferência e ajuste manual do estoque. Entradas pela loja continuam no fluxo normal.
            </p>
          </div>
        </div>

        {role === "ADMIN" && (
          <div className="mb-5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Distribuidor</label>
            <select
              value={pid}
              onChange={(e) => {
                setPid(e.target.value);
                void carregar(e.target.value);
              }}
              className="w-full md:max-w-md bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white"
            >
              <option value="">Selecione…</option>
              {distribuidores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name || d.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {erro && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300 font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {erro}
          </div>
        )}
        {ok && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle size={16} /> {ok}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-[#C9A66B]" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Estoque atual</p>
                <p className="text-xl font-black text-[#C9A66B] mt-1">{moeda(valorEstoque)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{itens.length} item(ns){nome ? ` · ${nome}` : ""}</p>
              </div>
              {grupoRyo && pedido ? (
                <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Último pedido (base deste estoque)</p>
                  <p className="text-xl font-black text-white mt-1">{moeda(pedido.total)}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {new Date(pedido.created_at).toLocaleDateString("pt-BR")} · {pedido.itens.length} item(ns)
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Conferência</p>
                  <p className="text-sm text-zinc-400 mt-2 leading-snug">
                    Altere quantidade e valor, depois salve a contagem.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <button
                type="button"
                onClick={() => void salvarContagem()}
                disabled={salvando || !sujo || itens.length === 0 || (role === "ADMIN" && !pid)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#C9A66B] text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar contagem
              </button>
            </div>

            <div className="rounded-2xl border border-white/5 bg-zinc-900/50 overflow-hidden">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[560px] text-xs">
                  <thead className="sticky top-0 bg-zinc-900 z-10">
                    <tr className="text-[9px] text-zinc-600 font-black uppercase tracking-widest border-b border-zinc-800">
                      <th className="text-left py-2 px-3">Produto</th>
                      <th className="text-right py-2 px-2">Qtd</th>
                      <th className="text-right py-2 px-2">Valor un.</th>
                      <th className="text-right py-2 px-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((it) => {
                      const qtd = Number(edits[it.id]?.quantity ?? it.quantity);
                      const custo = Number(edits[it.id]?.custo ?? it.custo_unitario);
                      const total = (Number.isFinite(qtd) ? qtd : 0) * (Number.isFinite(custo) ? custo : 0);
                      return (
                        <tr key={it.id} className="border-b border-zinc-800/50">
                          <td className="py-2 px-3 text-zinc-200 font-medium">{it.name}</td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={edits[it.id]?.quantity ?? ""}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [it.id]: { quantity: e.target.value, custo: prev[it.id]?.custo ?? String(it.custo_unitario) },
                                }))
                              }
                              className="w-20 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-right text-white"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={edits[it.id]?.custo ?? ""}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [it.id]: { quantity: prev[it.id]?.quantity ?? String(it.quantity), custo: e.target.value },
                                }))
                              }
                              className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-right text-white"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-black text-white tabular-nums">{moeda(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {itens.length === 0 && (
                  <p className="text-center text-zinc-500 text-sm py-8 px-4">
                    Nenhum item no estoque. Entradas da loja entram no fluxo normal; aqui você confere e ajusta.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
