"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import CrmCadastrarMembroPanel from "@/componentes/CrmCadastrarMembroPanel";
import ErroComVoltar from "@/componentes/ErroComVoltar";
import {
  X, Loader2, Plus, Minus, Trash2, Search, Package,
  MapPin, CreditCard, CheckCircle2, Truck,
  Kanban, RotateCcw, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import PedidoPdfClienteButton from "@/componentes/PedidoPdfClienteButton";

type LeadResumo = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  profile_id: string | null;
};

type Produto = {
  id: string;
  title: string;
  price: number;
  price_hairdresser: number;
  price_ambassador: number;
  price_distributor: number;
  preco_final?: number;
  preco_minimo?: number;
  stock: number;
  ativo: boolean;
};

type ItemPedido = {
  product_id: string;
  title: string;
  quantidade: number;
  preco_unitario: number;
  bonificado?: boolean;
  preco_minimo?: number;
  preco_final?: number;
};

type PerfilEndereco = {
  id: string;
  full_name: string | null;
  email?: string | null;
  role: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
};

const PAGAMENTOS = ["pix", "dinheiro", "cartao", "boleto", "transferencia", "manual"];
const PAGAMENTOS_VENDEDOR = [...PAGAMENTOS, "consignado"];

const STATUS_POS_PAGO = [
  { value: "separacao", label: "Em separação" },
  { value: "despachado", label: "Despachado" },
  { value: "entregue", label: "Entregue" },
];

function precoConsumidor(p: Produto, variant: string): number {
  if (variant === "vendedor") {
    return Number(p.preco_final) || Number(p.price_hairdresser) || Number(p.price) || 0;
  }
  return Number(p.price_hairdresser) || Number(p.price) || 0;
}

type Props = {
  lead: LeadResumo;
  onClose: () => void;
  onConcluido: (leadId: string) => void;
  onNovaCompra?: () => void;
  /** admin = CRM gestão · embaixadora = pedido da rede MascPRO · vendedor = equipe distribuidor */
  variant?: "admin" | "embaixadora" | "vendedor";
  apiBase?: string;
};

export default function CrmFechamentoPedidoModal({
  lead,
  onClose,
  onConcluido,
  onNovaCompra,
  variant = "admin",
  apiBase,
}: Props) {
  const isRede = variant === "embaixadora";
  const isVendedor = variant === "vendedor";
  const api = apiBase || (isVendedor ? "/api/vendedor/crm" : isRede ? "/api/embaixador/crm" : "/api/admin/crm");
  const accentHex = "#C9A66B";
  const leadHref = isVendedor
    ? `/vendedor/crm/leads/${lead.id}`
    : isRede
      ? `/embaixador/crm/leads/${lead.id}`
      : `/admin/crm/leads/${lead.id}`;
  const pagamentosLista = isVendedor ? PAGAMENTOS_VENDEDOR : isRede ? ["rede_embaixadora", ...PAGAMENTOS] : PAGAMENTOS;
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [frete, setFrete] = useState("0");
  const [pagamento, setPagamento] = useState("pix");
  const [confirmarPagamento, setConfirmarPagamento] = useState(false);

  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [municipio, setMunicipio] = useState(lead.cidade || "");
  const [uf, setUf] = useState(lead.estado || "");

  const [perfilVinculado, setPerfilVinculado] = useState<PerfilEndereco | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState<{
    order_id: string;
    status: string;
    gestor_tipo?: string;
    precisa_aprovacao?: boolean;
  } | null>(null);
  const [statusPedido, setStatusPedido] = useState("paid");
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [criandoNovaCompra, setCriandoNovaCompra] = useState(false);

  const carregarProdutos = useCallback(async (q: string) => {
    const url = `${api}/produtos${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (d?.ok) setProdutos(d.produtos || []);
  }, [api]);

  useEffect(() => { void carregarProdutos(""); }, [carregarProdutos]);

  useEffect(() => {
    const t = setTimeout(() => { void carregarProdutos(buscaProduto); }, 300);
    return () => clearTimeout(t);
  }, [buscaProduto, carregarProdutos]);

  useEffect(() => {
    if (!lead.profile_id || isRede || isVendedor) return;
    fetch(`${api}/leads/${lead.id}/converter?q=`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const p = (d?.perfis || []).find((x: PerfilEndereco) => x.id === lead.profile_id);
        if (p) aplicarEnderecoPerfil(p);
      })
      .catch(() => {});
  }, [lead.id, lead.profile_id, api, isRede, isVendedor]);

  async function criarNovaCompra() {
    setCriandoNovaCompra(true);
    setErro("");
    try {
      const res = await fetch(`${api}/leads/${lead.id}/nova-compra`, {
        method: "POST",
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setErro(d?.error || "Erro ao criar lead de nova compra.");
        return;
      }
      onNovaCompra?.();
      onConcluido(lead.id);
    } finally {
      setCriandoNovaCompra(false);
    }
  }

  function aplicarEnderecoPerfil(p: PerfilEndereco) {
    setPerfilVinculado(p);
    if (p.cep) setCep(p.cep);
    if (p.logradouro) setLogradouro(p.logradouro);
    if (p.numero) setNumero(p.numero);
    if (p.complemento) setComplemento(p.complemento);
    if (p.bairro) setBairro(p.bairro);
    if (p.municipio) setMunicipio(p.municipio);
    if (p.uf) setUf(p.uf);
  }

  function adicionarProduto(p: Produto) {
    const preco = precoConsumidor(p, variant);
    const minimo = isVendedor ? Number(p.preco_minimo) || preco : preco;
    const final = isVendedor ? Number(p.preco_final) || preco : preco;
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
          preco_minimo: minimo,
          preco_final: final,
          bonificado: false,
        },
      ];
    });
  }

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

  async function criarPedido() {
    if (itens.length === 0) {
      setErro("Adicione pelo menos um produto.");
      return;
    }
    if (!cep.trim() || !logradouro.trim()) {
      setErro("CEP e logradouro são obrigatórios para salvar o endereço.");
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      const res = await fetch(`${api}/leads/${lead.id}/fechar-pedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: perfilVinculado?.id || lead.profile_id || null,
          items: itens.map((i) => ({
            product_id: i.product_id,
            quantidade: i.quantidade,
            preco_unitario: i.bonificado ? 0 : i.preco_unitario,
            bonificado: Boolean(i.bonificado),
          })),
          payment_method: pagamento,
          shipping_cost: freteNum,
          confirmar_pagamento: confirmarPagamento,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          municipio,
          uf,
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setErro(d?.error || "Erro ao criar pedido.");
        return;
      }
      setSucesso({
        order_id: d.order_id,
        status: d.status,
        gestor_tipo: d.gestor_tipo || "distribuidor",
        precisa_aprovacao: d.precisa_aprovacao,
      });
      setStatusPedido(d.status === "pending" ? "pending" : "paid");
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarRecebimento() {
    setAtualizandoStatus(true);
    setErro("");
    try {
      const res = await fetch(`${api}/leads/${lead.id}/fechar-pedido`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "confirmar_pagamento" }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setErro(d?.error || "Erro ao confirmar pagamento.");
        return;
      }
      setStatusPedido("paid");
      setSucesso((s) => (s ? { ...s, status: "paid" } : s));
    } finally {
      setAtualizandoStatus(false);
    }
  }

  async function mudarStatusPedido(novoStatus: string) {
    if (isRede) return;
    setAtualizandoStatus(true);
    setErro("");
    try {
      const res = await fetch(`${api}/leads/${lead.id}/fechar-pedido`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "mudar_status", novo_status: novoStatus }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setErro(d?.error || "Erro ao atualizar status.");
        return;
      }
      setStatusPedido(novoStatus);
    } finally {
      setAtualizandoStatus(false);
    }
  }

  const inputClass =
    "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B] placeholder:text-zinc-700";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1";
  const btnPrimary = "bg-[#C9A66B] hover:bg-[#b08d55] text-black";

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
          <div>
            <h2
              className="font-black uppercase text-sm tracking-widest"
              style={{ color: accentHex }}
            >
              {isRede ? "Pedido da rede MascPRO" : isVendedor ? "Fechar venda (vendedor)" : "Fechar venda"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {lead.nome}
              {isRede && " · envio pela equipe MascPRO"}
              {isVendedor && " · tabela cabeleireiro · aprovação se houver desconto/bônus"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={20} className="text-zinc-500 hover:text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {erro && (
            <ErroComVoltar
              compacto
              mensagem={erro}
              onVoltar={() => {
                setErro("");
                onClose();
              }}
              onTentarNovamente={() => setErro("")}
              rotuloVoltar={isRede ? "Voltar ao pipeline" : "Voltar ao pipeline"}
            />
          )}

          {sucesso ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                <CheckCircle2 className="text-emerald-400 shrink-0" size={22} />
                <div>
                  <p className="font-bold text-emerald-300">
                    {isRede ? "Pedido da rede registrado!" : "Pedido criado!"}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    #{sucesso.order_id.slice(0, 8)} ·{" "}
                    {isVendedor
                      ? sucesso.precisa_aprovacao
                        ? "Aguardando aprovação do distribuidor"
                        : pagamento === "consignado"
                          ? "Consignado — não entra em meta/comissão"
                          : "Pedido registrado"
                      : isRede
                        ? "A MascPRO fará separação e envio"
                        : `Gestão: ${sucesso.gestor_tipo === "empresa" ? "MascPRO (empresa)" : "Distribuidor"}`}
                  </p>
                </div>
              </div>

              <PedidoPdfClienteButton orderId={sucesso.order_id} label="Gerar PDF para o cliente" className="w-full" />

              {statusPedido === "pending" && !isVendedor && (
                <button
                  type="button"
                  onClick={confirmarRecebimento}
                  disabled={atualizandoStatus}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  {atualizandoStatus ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CreditCard size={16} />
                  )}
                  Confirmar recebimento
                </button>
              )}

              {["paid", "separacao", "despachado"].includes(statusPedido) && !isRede && (
                <div className="space-y-2">
                  <p className={labelClass}>
                    <Truck size={12} className="inline mr-1" />
                    Atualizar status do pedido
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_POS_PAGO.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        disabled={atualizandoStatus || statusPedido === s.value}
                        onClick={() => mudarStatusPedido(s.value)}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onConcluido(lead.id)}
                  className={`w-full ${btnPrimary} font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2`}
                >
                  <Kanban size={14} />
                  Voltar ao pipeline
                </button>
                <Link
                  href={leadHref}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <ExternalLink size={14} />
                  Acompanhar lead
                </Link>
              </div>

              {["paid", "separacao", "despachado", "entregue"].includes(statusPedido) && !isRede && !isVendedor && (
                <button
                  type="button"
                  onClick={criarNovaCompra}
                  disabled={criandoNovaCompra}
                  className="w-full border border-zinc-700 hover:border-[#C9A66B]/50 text-zinc-300 hover:text-white font-black uppercase text-[10px] tracking-widest py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {criandoNovaCompra ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                  Nova compra no pipeline
                </button>
              )}
            </div>
          ) : (
            <>
              <CrmCadastrarMembroPanel
                leadId={lead.id}
                nome={lead.nome}
                emailInicial={lead.email}
                jaTemCadastro={Boolean(perfilVinculado || lead.profile_id)}
                onCadastrado={(p) => aplicarEnderecoPerfil(p as PerfilEndereco)}
                apiBase={api}
                permitirTipoMembro={isRede}
                accent="gold"
              />

              {perfilVinculado && (
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                  Cadastro vinculado: <strong>{perfilVinculado.full_name || lead.nome}</strong>
                  {perfilVinculado.email ? ` · ${perfilVinculado.email}` : ""}
                </div>
              )}

              <div>
                <p className={labelClass}>
                  <Package size={12} className="inline mr-1" />
                  Produtos
                </p>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    placeholder="Buscar produto..."
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <div className="max-h-32 overflow-y-auto border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                  {produtos.slice(0, 20).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => adicionarProduto(p)}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-900 flex justify-between items-center"
                    >
                      <span className="text-sm truncate">{p.title}</span>
                      <span className="text-[11px] text-[#C9A66B] shrink-0 ml-2">
                        R$ {precoConsumidor(p, variant).toFixed(2)}
                        {isVendedor && p.preco_minimo != null && (
                          <span className="text-zinc-600 ml-1">
                            (mín. {(Number(p.preco_minimo)).toFixed(2)})
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                {itens.length > 0 && (
                  <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {itens.map((i) => (
                      <li
                        key={i.product_id}
                        className="flex flex-wrap items-center gap-2 bg-zinc-900 rounded-xl p-2 border border-zinc-800"
                      >
                        <span className="flex-1 text-xs truncate min-w-[120px]">{i.title}</span>
                        {isVendedor && (
                          <>
                            <label className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <input
                                type="checkbox"
                                checked={Boolean(i.bonificado)}
                                onChange={(e) =>
                                  setItens((arr) =>
                                    arr.map((x) =>
                                      x.product_id === i.product_id
                                        ? { ...x, bonificado: e.target.checked, preco_unitario: e.target.checked ? 0 : x.preco_final || x.preco_unitario }
                                        : x
                                    )
                                  )
                                }
                              />
                              Bonificar
                            </label>
                            {!i.bonificado && (
                              <input
                                type="number"
                                step="0.01"
                                min={i.preco_minimo}
                                max={i.preco_final}
                                value={i.preco_unitario}
                                onChange={(e) =>
                                  setItens((arr) =>
                                    arr.map((x) =>
                                      x.product_id === i.product_id
                                        ? { ...x, preco_unitario: Number(e.target.value) || 0 }
                                        : x
                                    )
                                  )
                                }
                                className="w-20 bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-[10px] text-white"
                                title={`Entre ${i.preco_minimo?.toFixed(2)} e ${i.preco_final?.toFixed(2)}`}
                              />
                            )}
                          </>
                        )}
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => alterarQtd(i.product_id, -1)}>
                            <Minus size={12} />
                          </button>
                          <span className="text-xs w-5 text-center">{i.quantidade}</span>
                          <button type="button" onClick={() => alterarQtd(i.product_id, 1)}>
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="text-[10px] text-zinc-400 w-16 text-right">
                          {i.bonificado ? "Bônus" : `R$ ${(i.preco_unitario * i.quantidade).toFixed(2)}`}
                        </span>
                        <button type="button" onClick={() => alterarQtd(i.product_id, -i.quantidade)}>
                          <Trash2 size={12} className="text-zinc-600 hover:text-red-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className={labelClass}>
                  <MapPin size={12} className="inline mr-1" />
                  Endereço de entrega (salvo no perfil)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>CEP *</label>
                    <input value={cep} onChange={(e) => setCep(e.target.value)} className={inputClass} placeholder="00000-000" />
                  </div>
                  <div>
                    <label className={labelClass}>Número</label>
                    <input value={numero} onChange={(e) => setNumero(e.target.value)} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Logradouro *</label>
                    <input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Complemento</label>
                    <input value={complemento} onChange={(e) => setComplemento(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Bairro</label>
                    <input value={bairro} onChange={(e) => setBairro(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Cidade</label>
                    <input value={municipio} onChange={(e) => setMunicipio(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>UF</label>
                    <input value={uf} onChange={(e) => setUf(e.target.value)} maxLength={2} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Frete (R$)</label>
                    <input value={frete} onChange={(e) => setFrete(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Forma de pagamento</label>
                  <select
                    value={pagamento}
                    onChange={(e) => setPagamento(e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {pagamentosLista.map((p) => (
                      <option key={p} value={p} className="bg-zinc-900 text-white">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  {!isVendedor && (
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={confirmarPagamento}
                      onChange={(e) => setConfirmarPagamento(e.target.checked)}
                      className="rounded border-zinc-600"
                    />
                    Pagamento já recebido
                  </label>
                  )}
                  {isVendedor && pagamento === "consignado" && (
                    <p className="text-[10px] text-amber-400/90 pb-2">
                      Consignado não entra em metas nem comissão.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-zinc-800 pt-4">
                <span className="text-zinc-500 text-sm">Total</span>
                <span className="text-2xl font-black text-[#C9A66B]">
                  R$ {total.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={criarPedido}
                disabled={enviando}
                className={`w-full ${btnPrimary} disabled:opacity-60 font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2`}
              >
                {enviando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {enviando ? "Salvando..." : isRede ? "Registrar pedido da rede" : isVendedor ? "Enviar pedido" : "Criar pedido e fechar lead"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
