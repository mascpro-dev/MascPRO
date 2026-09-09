"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, Loader2, Save, Plus, Minus, Trash2, Search, AlertCircle, Pencil,
} from "lucide-react";
import PedidoPdfClienteButton from "@/componentes/PedidoPdfClienteButton";

type ItemEdit = {
  product_id: string;
  title: string;
  quantidade: number;
  preco_unitario: number;
  bonificado?: boolean;
  preco_tabela?: number | null;
};

type ProdutoBusca = {
  id: string;
  title: string;
  price_hairdresser?: number;
  preco_final?: number;
  preco_unitario_padrao?: number;
};

type Props = {
  orderId: string;
  onClose: () => void;
  onSaved?: () => void;
  /** API de produtos do vendedor */
  produtosApi?: string;
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VendedorEditarPedidoModal({
  orderId,
  onClose,
  onSaved,
  produtosApi = "/api/vendedor/crm/produtos",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [editavel, setEditavel] = useState(true);
  const [status, setStatus] = useState("");
  const [frete, setFrete] = useState("0");
  const [itens, setItens] = useState<ItemEdit[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtos, setProdutos] = useState<ProdutoBusca[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch(`/api/crm/pedidos/${orderId}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setErro(d?.error || "Não foi possível carregar o pedido.");
        return;
      }
      const o = d.pedido;
      setStatus(o.status || "");
      setEditavel(Boolean(d.editavel));
      setFrete(String(Number(o.shipping_cost || 0)));
      setItens(
        (o.order_items || []).map(
          (row: {
            product_id?: string;
            quantidade: number;
            preco_unitario: number;
            bonificado?: boolean;
            preco_tabela?: number | null;
            products?: { id?: string; title?: string } | null;
          }) => ({
            product_id: row.product_id || row.products?.id || "",
            title: row.products?.title || "Produto",
            quantidade: Number(row.quantidade || 1),
            preco_unitario: Number(row.preco_unitario || 0),
            bonificado: Boolean(row.bonificado),
            preco_tabela: row.preco_tabela != null ? Number(row.preco_tabela) : null,
          })
        ).filter((i: ItemEdit) => i.product_id)
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const carregarProdutos = useCallback(
    async (q: string) => {
      const res = await fetch(
        `${produtosApi}${q ? `?q=${encodeURIComponent(q)}` : ""}`,
        { cache: "no-store" }
      );
      const d = await res.json().catch(() => null);
      if (d?.ok) setProdutos(d.produtos || []);
    },
    [produtosApi]
  );

  useEffect(() => {
    const t = setTimeout(() => void carregarProdutos(buscaProduto), 300);
    return () => clearTimeout(t);
  }, [buscaProduto, carregarProdutos]);

  const subtotal = useMemo(
    () =>
      itens.reduce(
        (s, i) => s + i.quantidade * (i.bonificado ? 0 : i.preco_unitario),
        0
      ),
    [itens]
  );
  const freteNum = Number(String(frete).replace(",", ".")) || 0;
  const total = subtotal + freteNum;

  function alterarQtd(productId: string, delta: number) {
    setItens((arr) =>
      arr
        .map((i) =>
          i.product_id === productId
            ? { ...i, quantidade: Math.max(0, i.quantidade + delta) }
            : i
        )
        .filter((i) => i.quantidade > 0)
    );
  }

  function adicionarProduto(p: ProdutoBusca) {
    const preco =
      Number(p.preco_final) ||
      Number(p.preco_unitario_padrao) ||
      Number(p.price_hairdresser) ||
      0;
    setItens((arr) => {
      const ix = arr.findIndex((i) => i.product_id === p.id);
      if (ix >= 0) {
        const copia = [...arr];
        copia[ix] = { ...copia[ix], quantidade: copia[ix].quantidade + 1 };
        return copia;
      }
      return [
        ...arr,
        {
          product_id: p.id,
          title: p.title,
          quantidade: 1,
          preco_unitario: preco,
          preco_tabela: preco,
          bonificado: false,
        },
      ];
    });
  }

  async function salvar() {
    setErro("");
    if (!editavel) {
      setErro("Este pedido não pode mais ser alterado.");
      return;
    }
    if (itens.length === 0) {
      setErro("Adicione pelo menos um item.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch(`/api/crm/pedidos/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_cost: freteNum,
          items: itens.map((i) => ({
            product_id: i.product_id,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            bonificado: i.bonificado,
            preco_tabela: i.preco_tabela,
          })),
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setErro(d?.error || "Erro ao salvar.");
        return;
      }
      onSaved?.();
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  const inputClass =
    "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]";

  return (
    <div className="fixed inset-0 z-[450] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-6">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="font-black uppercase text-sm tracking-widest text-white flex items-center gap-2">
              <Pencil size={14} className="text-[#C9A66B]" /> Ajustar pedido
            </h2>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
              #{orderId.slice(0, 8)} · {status}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X size={22} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            {erro && (
              <div className="flex items-start gap-2 rounded-xl border border-red-800/50 bg-red-950/30 p-3 text-red-300 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erro}
              </div>
            )}

            {!editavel && (
              <p className="text-xs text-amber-400/90">
                Pedido já avançou no status — só é possível gerar o PDF. Para alterar itens, o status precisa ser novo ou pendente.
              </p>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Itens</p>
              {itens.map((i) => (
                <div
                  key={i.product_id}
                  className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{i.title}</p>
                    <p className="text-[10px] text-zinc-500">
                      {i.bonificado ? "Bonificado" : moeda(i.preco_unitario)}
                      {" · "}
                      {moeda(i.quantidade * (i.bonificado ? 0 : i.preco_unitario))}
                    </p>
                  </div>
                  {editavel && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => alterarQtd(i.product_id, -1)}
                        className="w-8 h-8 rounded-lg bg-zinc-800 text-white flex items-center justify-center hover:bg-zinc-700"
                        aria-label="Diminuir"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-black tabular-nums">
                        {i.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => alterarQtd(i.product_id, 1)}
                        className="w-8 h-8 rounded-lg bg-zinc-800 text-white flex items-center justify-center hover:bg-zinc-700"
                        aria-label="Aumentar"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setItens((arr) => arr.filter((x) => x.product_id !== i.product_id))
                        }
                        className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center"
                        aria-label="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!itens.length && (
                <p className="text-sm text-zinc-600">Nenhum item. Adicione produtos abaixo.</p>
              )}
            </div>

            {editavel && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Adicionar produto
                </p>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    placeholder="Buscar produto..."
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-zinc-800 divide-y divide-zinc-800/80">
                  {produtos.slice(0, 12).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => adicionarProduto(p)}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-900 text-sm text-white"
                    >
                      <span className="block truncate">{p.title}</span>
                      <span className="text-[10px] text-[#C9A66B]">
                        {moeda(
                          Number(p.preco_final) ||
                            Number(p.preco_unitario_padrao) ||
                            Number(p.price_hairdresser) ||
                            0
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Frete (R$)</label>
                <input
                  value={frete}
                  onChange={(e) => setFrete(e.target.value)}
                  disabled={!editavel}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Total</p>
                <p className="text-xl font-black text-[#C9A66B]">{moeda(total)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="shrink-0 border-t border-zinc-800 p-4 flex flex-col sm:flex-row gap-2">
          <PedidoPdfClienteButton orderId={orderId} label="PDF" className="sm:flex-1" />
          {editavel && (
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando || loading}
              className="sm:flex-[2] inline-flex items-center justify-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-50 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl"
            >
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar alterações
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
