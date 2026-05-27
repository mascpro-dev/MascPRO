"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, Loader2, Save, Plus, Minus, Trash2, Search, Package, User, AlertCircle,
} from "lucide-react";

type ItemEdit = {
  product_id: string;
  title: string;
  quantidade: number;
  preco_unitario: number;
};

type ProdutoBusca = {
  id: string;
  title: string;
  price_hairdresser: number;
  ativo: boolean;
};

type ClienteBusca = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

const STATUS_OPCOES = [
  { value: "novo", label: "Rascunho" },
  { value: "pending", label: "Aguardando confirmação" },
  { value: "paid", label: "Pago" },
  { value: "separacao", label: "Em separação" },
  { value: "despachado", label: "Despachado" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

const PAGAMENTOS = [
  "mercadopago",
  "manual",
  "pix",
  "dinheiro",
  "cartao",
  "boleto",
  "transferencia",
  "credito",
  "debito",
];

type Props = {
  orderId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditarPedidoModal({ orderId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [profileId, setProfileId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clientes, setClientes] = useState<ClienteBusca[]>([]);

  const [status, setStatus] = useState("pending");
  const [pagamento, setPagamento] = useState("mercadopago");
  const [frete, setFrete] = useState("0");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [rastreio, setRastreio] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [dataPrevisao, setDataPrevisao] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [mpPaymentId, setMpPaymentId] = useState("");
  const [mpPreferenceId, setMpPreferenceId] = useState("");

  const [itens, setItens] = useState<ItemEdit[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtos, setProdutos] = useState<ProdutoBusca[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setErro(d?.error || "Não foi possível carregar o pedido.");
        return;
      }
      const o = d.order;
      setProfileId(o.profile_id || "");
      setClienteNome(o.profiles?.full_name || o.profiles?.email || "");
      setStatus(o.status || "pending");
      setPagamento(o.payment_method || "manual");
      setFrete(String(Number(o.shipping_cost || 0)));
      setCep(o.shipping_cep || "");
      setEndereco(o.shipping_address || "");
      setRastreio(o.codigo_rastreio || "");
      setTransportadora(o.transportadora || "");
      setDataPrevisao(o.data_previsao ? String(o.data_previsao).slice(0, 10) : "");
      setParcelas(String(o.parcelas || 1));
      setMpPaymentId(o.mp_payment_id || "");
      setMpPreferenceId(o.mp_preference_id || "");
      setItens(
        (o.order_items || []).map(
          (row: {
            product_id: string;
            quantidade: number;
            preco_unitario: number;
            products?: { title?: string } | null;
          }) => ({
            product_id: row.product_id,
            title: row.products?.title || "Produto",
            quantidade: Number(row.quantidade || 1),
            preco_unitario: Number(row.preco_unitario || 0),
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (buscaCliente.trim().length < 2) {
        setClientes([]);
        return;
      }
      const res = await fetch(
        `/api/admin/pedidos-manuais/busca?tipo=clientes&q=${encodeURIComponent(buscaCliente)}`,
        { cache: "no-store" }
      );
      const d = await res.json().catch(() => null);
      if (d?.ok) setClientes(d.clientes || []);
    }, 300);
    return () => clearTimeout(t);
  }, [buscaCliente]);

  const carregarProdutos = useCallback(async (q: string) => {
    const res = await fetch(
      `/api/admin/pedidos-manuais/busca?tipo=produtos${q ? `&q=${encodeURIComponent(q)}` : ""}`,
      { cache: "no-store" }
    );
    const d = await res.json().catch(() => null);
    if (d?.ok) setProdutos(d.produtos || []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void carregarProdutos(buscaProduto), 300);
    return () => clearTimeout(t);
  }, [buscaProduto, carregarProdutos]);

  const subtotal = useMemo(
    () => itens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0),
    [itens]
  );
  const freteNum = Number(frete.replace(",", ".")) || 0;
  const total = subtotal + freteNum;

  function adicionarProduto(p: ProdutoBusca) {
    if (!p.ativo) return;
    const preco = Number(p.price_hairdresser) || 0;
    setItens((arr) => {
      const ix = arr.findIndex((i) => i.product_id === p.id);
      if (ix >= 0) {
        const copia = [...arr];
        copia[ix] = { ...copia[ix], quantidade: copia[ix].quantidade + 1 };
        return copia;
      }
      return [...arr, { product_id: p.id, title: p.title, quantidade: 1, preco_unitario: preco }];
    });
  }

  async function salvar() {
    setErro("");
    if (!profileId) {
      setErro("Selecione o cliente do pedido.");
      return;
    }
    if (itens.length === 0) {
      setErro("Adicione pelo menos um item.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          profile_id: profileId,
          status,
          payment_method: pagamento,
          shipping_cost: freteNum,
          shipping_cep: cep || null,
          shipping_address: endereco || null,
          codigo_rastreio: rastreio || null,
          transportadora: transportadora || null,
          data_previsao: dataPrevisao || null,
          parcelas: Number(parcelas) || 1,
          mp_payment_id: mpPaymentId || null,
          mp_preference_id: mpPreferenceId || null,
          items: itens.map((i) => ({
            product_id: i.product_id,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
          })),
        }),
      });
      const raw = await res.text();
      let d: { ok?: boolean; error?: string } = {};
      try {
        d = raw ? JSON.parse(raw) : {};
      } catch {
        setErro("Resposta inválida do servidor.");
        return;
      }
      if (!res.ok || !d.ok) {
        setErro(d.error || "Erro ao salvar.");
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-6">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="font-black uppercase text-sm tracking-widest text-white">
              Editar pedido
            </h2>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate max-w-[280px]">
              {orderId}
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
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-5">
            {erro && (
              <div className="flex items-start gap-2 rounded-xl border border-red-800/50 bg-red-950/30 p-3 text-red-300 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erro}
              </div>
            )}

            <p className="text-[10px] text-amber-400/90 leading-relaxed">
              Alterar valor ou itens não recalcula comissão/PRO já liberados. Ajuste manualmente se necessário.
            </p>

            {/* Cliente */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <User size={12} /> Cliente
              </h3>
              {clienteNome && (
                <p className="text-sm font-bold text-white">
                  Atual: {clienteNome}
                </p>
              )}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  placeholder="Buscar outro cliente (mín. 2 letras)…"
                  className="w-full bg-black border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                />
              </div>
              {clientes.length > 0 && (
                <ul className="max-h-32 overflow-y-auto border border-zinc-800 rounded-lg divide-y divide-zinc-800">
                  {clientes.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileId(c.id);
                          setClienteNome(c.full_name || c.email || "");
                          setClientes([]);
                          setBuscaCliente("");
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-800/60 text-sm"
                      >
                        {c.full_name} · <span className="text-zinc-500">{c.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Pedido + entrega */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                >
                  {STATUS_OPCOES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Pagamento</label>
                <select
                  value={pagamento}
                  onChange={(e) => setPagamento(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                >
                  {PAGAMENTOS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Frete (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={frete}
                  onChange={(e) => setFrete(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">CEP</label>
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Endereço</label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Rastreio</label>
                <input
                  type="text"
                  value={rastreio}
                  onChange={(e) => setRastreio(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Transportadora</label>
                <input
                  type="text"
                  value={transportadora}
                  onChange={(e) => setTransportadora(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Previsão entrega</label>
                <input
                  type="date"
                  value={dataPrevisao}
                  onChange={(e) => setDataPrevisao(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Parcelas</label>
                <input
                  type="number"
                  min={1}
                  value={parcelas}
                  onChange={(e) => setParcelas(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">MP Payment ID</label>
                <input
                  type="text"
                  value={mpPaymentId}
                  onChange={(e) => setMpPaymentId(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-[#C9A66B]"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">MP Preference ID</label>
                <input
                  type="text"
                  value={mpPreferenceId}
                  onChange={(e) => setMpPreferenceId(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-[#C9A66B]"
                />
              </div>
            </section>

            {/* Itens */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Package size={12} /> Itens ({itens.length})
              </h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  placeholder="Adicionar produto…"
                  className="w-full bg-black border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                />
              </div>
              {produtos.length > 0 && (
                <div className="max-h-36 overflow-y-auto border border-zinc-800 rounded-lg divide-y divide-zinc-800">
                  {produtos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => adicionarProduto(p)}
                      disabled={!p.ativo}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-800/60 text-sm flex justify-between gap-2 disabled:opacity-40"
                    >
                      <span className="truncate">{p.title}</span>
                      <span className="text-[#C9A66B] font-bold shrink-0">
                        R$ {Number(p.price_hairdresser || 0).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {itens.map((i) => (
                  <div
                    key={i.product_id}
                    className="flex items-center gap-2 bg-black/50 rounded-lg p-3 border border-zinc-800"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{i.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 bg-zinc-900 rounded border border-zinc-700">
                          <button
                            type="button"
                            onClick={() =>
                              setItens((arr) =>
                                arr.map((x) =>
                                  x.product_id === i.product_id
                                    ? { ...x, quantidade: Math.max(1, x.quantidade - 1) }
                                    : x
                                )
                              )
                            }
                            className="p-1"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs w-6 text-center">{i.quantidade}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setItens((arr) =>
                                arr.map((x) =>
                                  x.product_id === i.product_id
                                    ? { ...x, quantidade: x.quantidade + 1 }
                                    : x
                                )
                              )
                            }
                            className="p-1"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <label className="text-[10px] text-zinc-500 flex items-center gap-1">
                          R$
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={i.preco_unitario}
                            onChange={(e) =>
                              setItens((arr) =>
                                arr.map((x) =>
                                  x.product_id === i.product_id
                                    ? { ...x, preco_unitario: Number(e.target.value) }
                                    : x
                                )
                              )
                            }
                            className="w-20 bg-black border border-zinc-700 rounded px-2 py-0.5 text-xs"
                          />
                        </label>
                        <span className="text-[10px] text-zinc-400">
                          = R$ {(i.preco_unitario * i.quantidade).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setItens((arr) => arr.filter((x) => x.product_id !== i.product_id))
                      }
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm border-t border-zinc-800 pt-3">
                <span className="text-zinc-400">Subtotal + frete</span>
                <span className="font-black text-[#C9A66B] text-lg">R$ {total.toFixed(2)}</span>
              </div>
            </section>
          </div>
        )}

        <div className="shrink-0 flex gap-2 p-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-900"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || loading}
            className="flex-1 py-3 rounded-xl bg-[#C9A66B] hover:bg-[#B89559] text-black font-black uppercase text-[10px] tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}
