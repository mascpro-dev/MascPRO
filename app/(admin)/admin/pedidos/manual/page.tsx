"use client";
import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminSidebar from "@/componentes/AdminSidebar";
import {
  ShoppingBag, User, Plus, Minus, Trash2, Search, Save, Loader2,
  CheckCircle2, AlertCircle, ArrowLeft, Package,
} from "lucide-react";

// Suspense boundary obrigatório no Next 14 quando há useSearchParams() (senão quebra o build).
export default function PedidoManualPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-black text-white items-center justify-center">
          <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
        </div>
      }
    >
      <PedidoManualPage />
    </Suspense>
  );
}

type Cliente = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
};

type Produto = {
  id: string;
  title: string;
  price: number;
  price_hairdresser: number;
  price_ambassador: number;
  price_distributor: number;
  stock: number;
  ativo: boolean;
};

type ItemPedido = {
  product_id: string;
  title: string;
  quantidade: number;
  preco_unitario: number;
};

type StatusInicial = "paid" | "separacao" | "despachado" | "entregue" | "pending" | "novo";

const STATUS_OPCOES: { value: StatusInicial; label: string; hint: string }[] = [
  { value: "paid", label: "Pago (liberar comissão)", hint: "Gera comissão + bônus PRO + baixa estoque" },
  { value: "separacao", label: "Em separação", hint: "Já considera pago" },
  { value: "despachado", label: "Despachado", hint: "Já considera pago" },
  { value: "entregue", label: "Entregue", hint: "Já considera pago" },
  { value: "pending", label: "Aguardando pagamento", hint: "Não gera comissão até virar pago" },
  { value: "novo", label: "Rascunho", hint: "Só cria o pedido — não gera comissão" },
];

const PAGAMENTOS = ["manual", "pix", "dinheiro", "cartao", "boleto", "transferencia"];

function precoPorRole(p: Produto, role: string | null | undefined): number {
  const r = String(role || "").trim().toUpperCase();
  if (r === "DISTRIBUIDOR") return Number(p.price_distributor) || Number(p.price) || 0;
  if (r === "EMBAIXADOR")   return Number(p.price_ambassador)  || Number(p.price) || 0;
  if (r === "CABELEIREIRO") return Number(p.price_hairdresser) || Number(p.price) || 0;
  return Number(p.price_hairdresser) || Number(p.price) || 0;
}

function PedidoManualPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preCliente = searchParams.get("cliente");
  const preItens = searchParams.get("itens");

  const [buscaCliente, setBuscaCliente] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);

  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [freteValor, setFreteValor] = useState("0");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");

  const [status, setStatus] = useState<StatusInicial>("paid");
  const [pagamento, setPagamento] = useState("manual");
  const [rastreio, setRastreio] = useState("");
  const [transportadora, setTransportadora] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  const carregarProdutos = useCallback(async (q: string) => {
    setCarregandoProdutos(true);
    try {
      const url = `/api/admin/pedidos-manuais/busca?tipo=produtos${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (d?.ok) setProdutos(d.produtos || []);
    } finally {
      setCarregandoProdutos(false);
    }
  }, []);

  useEffect(() => { void carregarProdutos(""); }, [carregarProdutos]);

  // Pré-carrega cliente + itens vindos do carrinho abandonado (?cliente=&itens=)
  useEffect(() => {
    let cancelled = false;
    async function preCarregar() {
      if (!preCliente && !preItens) return;

      if (preCliente) {
        try {
          const res = await fetch(`/api/admin/pedidos-manuais/busca?tipo=clientes&q=${encodeURIComponent(preCliente)}`, { cache: "no-store" });
          const d = await res.json().catch(() => null);
          const lista: Cliente[] = d?.clientes || [];
          const c = lista.find((x) => x.id === preCliente) || lista[0] || null;
          if (c && !cancelled) setClienteSel(c);
        } catch { /* ignora */ }
      }

      if (preItens) {
        // Formato: "id1:qty:price,id2:qty:price"
        const partes = preItens
          .split(",")
          .map((p) => p.split(":"))
          .filter((p) => p.length >= 2);
        const ids = partes.map((p) => p[0]).filter(Boolean);
        if (ids.length === 0) return;

        try {
          const res = await fetch(`/api/admin/pedidos-manuais/busca?tipo=produtos`, { cache: "no-store" });
          const d = await res.json().catch(() => null);
          const todos: Produto[] = d?.produtos || [];
          if (cancelled) return;
          const itensIniciais: ItemPedido[] = partes
            .map(([id, qtd, preco]) => {
              const p = todos.find((pp) => pp.id === id);
              if (!p) return null;
              const qty = Math.max(1, Math.floor(Number(qtd) || 1));
              const precoNum = Number(preco) > 0 ? Number(preco) : precoPorRole(p, null);
              return {
                product_id: p.id,
                title: p.title,
                quantidade: qty,
                preco_unitario: precoNum,
              };
            })
            .filter((x): x is ItemPedido => x !== null);
          if (itensIniciais.length > 0) setItens(itensIniciais);
        } catch { /* ignora */ }
      }
    }
    void preCarregar();
    return () => { cancelled = true; };
  }, [preCliente, preItens]);

  useEffect(() => {
    const t = setTimeout(() => { void carregarProdutos(buscaProduto); }, 300);
    return () => clearTimeout(t);
  }, [buscaProduto, carregarProdutos]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (buscaCliente.trim().length < 2) { setClientes([]); return; }
      const res = await fetch(`/api/admin/pedidos-manuais/busca?tipo=clientes&q=${encodeURIComponent(buscaCliente)}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (d?.ok) setClientes(d.clientes || []);
    }, 300);
    return () => clearTimeout(t);
  }, [buscaCliente]);

  function adicionarProduto(p: Produto) {
    if (!p.ativo) return;
    const preco = precoPorRole(p, clienteSel?.role);
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

  function alterarQtd(productId: string, delta: number) {
    setItens((arr) =>
      arr
        .map((i) => i.product_id === productId ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i)
        .filter((i) => i.quantidade > 0)
    );
  }

  function alterarPreco(productId: string, novoPreco: number) {
    setItens((arr) =>
      arr.map((i) =>
        i.product_id === productId ? { ...i, preco_unitario: Math.max(0, novoPreco) } : i
      )
    );
  }

  function removerItem(productId: string) {
    setItens((arr) => arr.filter((i) => i.product_id !== productId));
  }

  useEffect(() => {
    if (!clienteSel) return;
    setItens((arr) =>
      arr.map((i) => {
        const p = produtos.find((pp) => pp.id === i.product_id);
        return p ? { ...i, preco_unitario: precoPorRole(p, clienteSel.role) } : i;
      })
    );
    if (clienteSel.cep) setCep(clienteSel.cep);
    const endParts = [
      clienteSel.logradouro,
      clienteSel.numero ? `nº ${clienteSel.numero}` : null,
      clienteSel.complemento,
      clienteSel.bairro,
      clienteSel.municipio && clienteSel.uf ? `${clienteSel.municipio}/${clienteSel.uf}` : null,
    ].filter(Boolean);
    if (endParts.length > 0) setEndereco(endParts.join(", "));
  }, [clienteSel, produtos]);

  const subtotal = useMemo(
    () => itens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0),
    [itens]
  );
  const freteNum = Number(freteValor.replace(",", ".")) || 0;
  const total = subtotal + freteNum;

  async function salvar() {
    setFeedback(null);
    if (!clienteSel) {
      setFeedback({ tipo: "erro", msg: "Selecione o cliente." });
      return;
    }
    if (itens.length === 0) {
      setFeedback({ tipo: "erro", msg: "Adicione pelo menos 1 produto." });
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/pedidos-manuais", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          profile_id: clienteSel.id,
          items: itens.map((i) => ({
            product_id: i.product_id,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
          })),
          shipping_cost: freteNum,
          shipping_cep: cep || null,
          shipping_address: endereco || null,
          payment_method: pagamento,
          status,
          codigo_rastreio: rastreio || null,
          transportadora: transportadora || null,
        }),
      });
      const raw = await res.text();
      let d: { ok?: boolean; error?: string; order_id?: string; recompensas?: { valorComissao?: number; proPropria?: number } } = {};
      try { d = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }
      if (!res.ok || !d.ok) {
        setFeedback({ tipo: "erro", msg: d.error || "Erro ao criar pedido." });
        return;
      }
      const recomp = d.recompensas;
      const detalhes: string[] = [];
      if (recomp?.valorComissao && recomp.valorComissao > 0) {
        detalhes.push(`Comissão liberada: R$ ${recomp.valorComissao.toFixed(2)}`);
      }
      if (recomp?.proPropria && recomp.proPropria > 0) {
        detalhes.push(`PRO próprio do cliente: +${recomp.proPropria}`);
      }
      setFeedback({
        tipo: "ok",
        msg: `Pedido criado com sucesso! ${detalhes.join(" · ")}`,
      });
      setItens([]);
      setFreteValor("0");
      setRastreio("");
      setTransportadora("");
      setTimeout(() => router.push("/admin/pedidos"), 1500);
    } catch (e) {
      setFeedback({
        tipo: "erro",
        msg: e instanceof Error ? e.message : "Erro inesperado.",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-0 min-h-screen overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <button
            onClick={() => router.push("/admin/pedidos")}
            className="text-zinc-400 hover:text-white"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <ShoppingBag size={28} className="text-[#C9A66B]" />
          <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">
            Novo pedido manual
          </h1>
        </div>

        {feedback && (
          <div
            className={`flex items-start gap-2 rounded-xl border p-4 mb-6 ${
              feedback.tipo === "ok"
                ? "bg-emerald-900/20 border-emerald-700/40 text-emerald-300"
                : "bg-red-900/20 border-red-800/40 text-red-300"
            }`}
          >
            {feedback.tipo === "ok" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <p className="text-sm">{feedback.msg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start pb-8">
          <section className="lg:col-span-2 space-y-6 min-w-0">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <h2 className="text-xs uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                <User size={14} /> Cliente
              </h2>
              {clienteSel ? (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{clienteSel.full_name || "Sem nome"}</p>
                    <p className="text-xs text-zinc-400">{clienteSel.email}</p>
                    <p className="text-[11px] text-[#C9A66B] mt-1">
                      {clienteSel.role || "—"}
                    </p>
                  </div>
                  <button
                    onClick={() => { setClienteSel(null); setClientes([]); setBuscaCliente(""); }}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={buscaCliente}
                      onChange={(e) => setBuscaCliente(e.target.value)}
                      placeholder="Buscar cliente (mín. 2 letras)…"
                      className="w-full bg-black border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                    />
                  </div>
                  {clientes.length > 0 && (
                    <ul className="mt-3 max-h-60 overflow-y-auto divide-y divide-zinc-800 border border-zinc-800 rounded-lg">
                      {clientes.map((c) => (
                        <li key={c.id}>
                          <button
                            onClick={() => setClienteSel(c)}
                            className="w-full text-left px-3 py-2 hover:bg-zinc-800/60"
                          >
                            <p className="text-sm font-medium">{c.full_name || "(sem nome)"}</p>
                            <p className="text-[11px] text-zinc-500">{c.email} · {c.role}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <h2 className="text-xs uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                <Package size={14} /> Produtos
              </h2>

              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  placeholder="Buscar produto…"
                  className="w-full bg-black border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div className="max-h-72 sm:max-h-80 overflow-y-auto overscroll-contain border border-zinc-800 rounded-lg divide-y divide-zinc-800 pr-1">
                {carregandoProdutos && (
                  <div className="p-3 text-xs text-zinc-500 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> Carregando…
                  </div>
                )}
                {!carregandoProdutos && produtos.length === 0 && (
                  <p className="p-3 text-xs text-zinc-500">Nenhum produto encontrado.</p>
                )}
                {produtos.map((p) => {
                  const preco = precoPorRole(p, clienteSel?.role);
                  return (
                    <button
                      key={p.id}
                      onClick={() => adicionarProduto(p)}
                      disabled={!p.ativo}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-800/60 disabled:opacity-50 flex justify-between items-center gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-[10px] text-zinc-500">
                          Estoque: {p.stock} · {p.ativo ? "Ativo" : "Inativo"}
                        </p>
                      </div>
                      <span className="text-sm font-black text-[#C9A66B]">
                        R$ {preco.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col min-h-0">
              <h2 className="text-xs uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Itens do pedido
                {itens.length > 0 && (
                  <span className="ml-2 text-zinc-600 font-normal normal-case">
                    ({itens.length} {itens.length === 1 ? "item" : "itens"})
                  </span>
                )}
              </h2>
              {itens.length === 0 ? (
                <p className="text-sm text-zinc-500">Adicione produtos no quadro acima.</p>
              ) : (
                <div className="max-h-80 sm:max-h-[28rem] overflow-y-auto overscroll-contain pr-1">
                <ul className="space-y-2">
                  {itens.map((i) => (
                    <li key={i.product_id} className="flex items-center gap-3 bg-black/40 rounded-lg p-3 border border-zinc-800">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{i.title}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 bg-zinc-900 rounded-lg border border-zinc-700">
                            <button onClick={() => alterarQtd(i.product_id, -1)} className="p-1.5 hover:text-[#C9A66B]">
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-bold w-6 text-center">{i.quantidade}</span>
                            <button onClick={() => alterarQtd(i.product_id, +1)} className="p-1.5 hover:text-[#C9A66B]">
                              <Plus size={12} />
                            </button>
                          </div>
                          <label className="flex items-center gap-1 text-[10px] text-zinc-500">
                            R$
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={i.preco_unitario}
                              onChange={(e) => alterarPreco(i.product_id, Number(e.target.value))}
                              className="w-24 bg-black border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </label>
                          <span className="text-[11px] text-zinc-400">
                            = R$ {(i.preco_unitario * i.quantidade).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => removerItem(i.product_id)} className="text-zinc-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
                </div>
              )}
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3 shrink-0">
              <h2 className="text-xs uppercase tracking-widest text-zinc-400">Entrega</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">CEP</label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Endereço completo</label>
                  <input
                    type="text"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, nº, bairro, cidade/UF"
                    className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Frete (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={freteValor}
                    onChange={(e) => setFreteValor(e.target.value)}
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
              </div>
            </div>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-6 self-start w-full">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Resumo</h2>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Subtotal</span>
                <span className="font-bold">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Frete</span>
                <span className="font-bold">R$ {freteNum.toFixed(2)}</span>
              </div>
              <div className="border-t border-zinc-800 pt-3 flex justify-between">
                <span className="text-zinc-400 font-bold uppercase text-[11px] tracking-widest">Total</span>
                <span className="text-2xl font-black text-[#C9A66B]">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Pagamento</h2>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Método</label>
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
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusInicial)}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A66B]"
                >
                  {STATUS_OPCOES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {STATUS_OPCOES.find((o) => o.value === status)?.hint}
                </p>
              </div>
            </div>

            <button
              onClick={salvar}
              disabled={enviando || !clienteSel || itens.length === 0}
              className="w-full bg-[#C9A66B] text-black font-black uppercase text-xs tracking-widest py-4 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-[#B89559] transition-colors"
            >
              {enviando ? (
                <><Loader2 size={16} className="animate-spin" /> Salvando…</>
              ) : (
                <><Save size={16} /> Criar pedido</>
              )}
            </button>
          </aside>
        </div>
        </div>
      </main>
    </div>
  );
}
