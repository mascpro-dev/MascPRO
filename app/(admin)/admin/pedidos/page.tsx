"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/componentes/AdminSidebar";
import AdminMemberAvatar from "@/componentes/AdminMemberAvatar";
import EditarPedidoModal from "@/componentes/EditarPedidoModal";
import Link from "next/link";
import {
  ShoppingBag, CheckCircle, XCircle, Clock,
  Loader2, RefreshCw, PackageCheck, PackageOpen, Truck, Trash2,
  FileText, ExternalLink, Plus, AlertTriangle, Mail, Search, UserSearch, Pencil,
} from "lucide-react";

type Pedido = {
  id: string;
  profile_id: string;
  total: number;
  status: string;
  payment_method: string;
  mp_payment_id: string | null;
  shipping_cost?: number | null;
  shipping_cep?: string | null;
  shipping_address?: string | null;
  codigo_rastreio?: string | null;
  transportadora?: string | null;
  data_previsao?: string | null;
  parcelas?: number | null;
  created_at: string;
  profiles: { full_name: string; nivel: string; avatar_url?: string | null } | null;
  order_items: { quantidade: number; preco_unitario: number; products: { title: string } | null }[];
};

type StatusInfo = { label: string; style: string; icon: React.ReactNode };

const STATUS: Record<string, StatusInfo> = {
  novo:       { label: "Rascunho / legado",    style: "bg-zinc-800 text-zinc-400 border-zinc-700",       icon: <Clock size={10} className="inline mr-1" /> },
  pending:    { label: "Aguardando confirmação da Masc PRO", style: "bg-zinc-800 text-zinc-400 border-zinc-700",       icon: <Clock size={10} className="inline mr-1" /> },
  paid:       { label: "Pago — aguardando separação", style: "bg-blue-900/30 text-blue-400 border-blue-800/40", icon: <CheckCircle size={10} className="inline mr-1" /> },
  separacao:  { label: "Em separação",         style: "bg-yellow-900/30 text-yellow-400 border-yellow-800/40", icon: <PackageCheck size={10} className="inline mr-1" /> },
  despachado: { label: "Despachado",           style: "bg-green-900/30 text-green-400 border-green-800/40",  icon: <Truck size={10} className="inline mr-1" /> },
  entregue:   { label: "Entregue",             style: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50", icon: <PackageOpen size={10} className="inline mr-1" /> },
  cancelled:  { label: "Cancelado",            style: "bg-red-900/30 text-red-400 border-red-800/40",         icon: <XCircle size={10} className="inline mr-1" /> },
};

type Filtro = "todos" | "abandonados" | "pending" | "paid" | "separacao" | "despachado" | "entregue" | "cancelled";

type CarrinhoAbandonado = {
  profile_id: string;
  items: Array<{ id: string; title: string; quantity: number; price: number; image_url?: string }>;
  subtotal: number;
  shipping_cep: string | null;
  shipping_address: string | null;
  shipping_cost: number;
  updated_at: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    role: string | null;
    avatar_url: string | null;
  } | null;
};

export default function AdminPedidosPage() {
  const supabase = createClientComponentClient();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [processando, setProcessando] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState("");
  const [limpando, setLimpando] = useState(false);
  const [syncingMp, setSyncingMp] = useState(false);

  const [editarPedidoId, setEditarPedidoId] = useState<string | null>(null);

  // Modal de tracking
  const [modalTracking, setModalTracking] = useState<Pedido | null>(null);
  const [tracking, setTracking] = useState({ codigo: "", transportadora: "", previsao: "" });
  const [salvandoTracking, setSalvandoTracking] = useState(false);

  // Modal NF-e
  const [modalNfe, setModalNfe] = useState<Pedido | null>(null);
  const [nfeForm, setNfeForm] = useState({ cpf_cnpj: "", observacao: "" });
  const [emitindoNfe, setEmitindoNfe] = useState(false);
  const [nfeResultado, setNfeResultado] = useState<{ numero?: string; chave?: string; erro?: string } | null>(null);

  // Carrinhos abandonados
  const [carrinhos, setCarrinhos] = useState<CarrinhoAbandonado[]>([]);
  const [loadingCarrinhos, setLoadingCarrinhos] = useState(false);

  // Busca de cliente (diagnóstico)
  const [buscaCliente, setBuscaCliente] = useState("");
  const [diagResultados, setDiagResultados] = useState<Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    avatar_url: string | null;
    last_sign_in_at: string | null;
    pedidos: Array<{
      id: string;
      total: number;
      status: string;
      payment_method: string;
      mp_payment_id: string | null;
      shipping_cost: number;
      created_at: string;
      order_items?: Array<{ quantidade: number; preco_unitario: number; products: { title: string } | null }>;
    }>;
    carrinho: {
      items?: Array<{ id: string; title: string; quantity: number; price: number }>;
      subtotal?: number;
      status?: string;
      updated_at?: string;
    } | null;
  }>>([]);
  const [diagLoading, setDiagLoading] = useState(false);

  useEffect(() => { carregarPedidos(); }, [filtro]);
  useEffect(() => {
    if (filtro === "abandonados") void carregarCarrinhosAbandonados();
  }, [filtro]);

  async function carregarCarrinhosAbandonados() {
    setLoadingCarrinhos(true);
    try {
      const res = await fetch("/api/admin/carrinhos-abandonados", { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (d?.ok) setCarrinhos(d.carrinhos || []);
    } finally {
      setLoadingCarrinhos(false);
    }
  }

  async function buscarCliente() {
    const q = buscaCliente.trim();
    if (q.length < 2) {
      alert("Digite ao menos 2 letras do nome ou e-mail.");
      return;
    }
    setDiagLoading(true);
    try {
      const res = await fetch(`/api/admin/clientes/diagnostico?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (!d?.ok) {
        alert(d?.error || "Erro ao buscar cliente.");
        return;
      }
      setDiagResultados(d.clientes || []);
    } finally {
      setDiagLoading(false);
    }
  }

  async function descartarCarrinho(profileId: string) {
    if (!confirm("Descartar este carrinho abandonado?")) return;
    const res = await fetch("/api/admin/carrinhos-abandonados", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    const d = await res.json().catch(() => null);
    if (!d?.ok) {
      alert(d?.error || "Erro ao descartar carrinho.");
      return;
    }
    await carregarCarrinhosAbandonados();
  }

  async function emitirNfe(pedidoId: string) {
    setEmitindoNfe(true);
    setNfeResultado(null);
    const res = await fetch("/api/admin/nfe/emitir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id:    pedidoId,
        cpf_cnpj:    nfeForm.cpf_cnpj.replace(/\D/g, ""),
        observacao:  nfeForm.observacao,
      }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      setNfeResultado({ numero: d.numero_nfe, chave: d.chave_acesso });
    } else {
      setNfeResultado({ erro: d?.error || "Erro ao emitir NF-e." });
    }
    setEmitindoNfe(false);
  }

  async function salvarTracking(pedidoId: string) {
    setSalvandoTracking(true);
    await supabase.from("orders").update({
      codigo_rastreio: tracking.codigo || null,
      transportadora:  tracking.transportadora || null,
      data_previsao:   tracking.previsao || null,
      status:          "despachado",
    }).eq("id", pedidoId);
    await carregarPedidos();
    setModalTracking(null);
    setSalvandoTracking(false);
  }

  function pagamentoLabel(metodo: string) {
    const m = String(metodo || "").toLowerCase();
    if (m === "mercadopago") return "Mercado Pago";
    if (m === "pix") return "PIX";
    if (m === "credito") return "Cartao credito";
    if (m === "debito") return "Cartao debito";
    if (m === "boleto") return "Boleto";
    if (m === "pendente") return "Pendente";
    return metodo || "Nao informado";
  }

  function imprimirLogisticaPdf(pedido: Pedido) {
    const itens = (pedido.order_items || [])
      .map((item) => {
        const nome = item.products?.title || "Produto";
        const qtd = Number(item.quantidade || 0);
        const unit = Number(item.preco_unitario || 0);
        const subtotal = unit * qtd;
        return `<tr>
          <td style="padding:8px;border:1px solid #ddd">${nome}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${qtd}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">R$ ${unit.toFixed(2)}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">R$ ${subtotal.toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Pedido ${pedido.id}</title>
  </head>
  <body style="font-family:Arial,sans-serif;color:#111;padding:18px">
    <h2 style="margin:0 0 8px 0">MascPRO - Ficha de Separacao/Expedicao</h2>
    <p style="margin:2px 0"><strong>Pedido:</strong> ${pedido.id}</p>
    <p style="margin:2px 0"><strong>Data:</strong> ${new Date(pedido.created_at).toLocaleString("pt-BR")}</p>
    <p style="margin:2px 0"><strong>Cliente:</strong> ${pedido.profiles?.full_name || "-"}</p>
    <p style="margin:2px 0"><strong>Pagamento:</strong> ${pagamentoLabel(pedido.payment_method)}</p>
    <p style="margin:2px 0"><strong>Status:</strong> ${STATUS[pedido.status]?.label || pedido.status}</p>
    <p style="margin:2px 0"><strong>Frete:</strong> R$ ${Number(pedido.shipping_cost || 0).toFixed(2)}</p>
    <p style="margin:2px 0"><strong>CEP:</strong> ${pedido.shipping_cep || "-"}</p>
    <p style="margin:6px 0 10px 0"><strong>Endereco:</strong> ${pedido.shipping_address || "-"}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #ddd;text-align:left">Produto</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:center">Qtd</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right">Unit.</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itens}</tbody>
    </table>
    <p style="margin-top:10px"><strong>Total pedido:</strong> R$ ${Number(pedido.total || 0).toFixed(2)}</p>
    <p style="margin-top:26px">Separacao: ____________________</p>
    <p style="margin-top:18px">Conferencia: ____________________</p>
    <script>window.print()</script>
  </body>
</html>`;
    const w = window.open("", "_blank", "width=980,height=720");
    if (!w) {
      alert("Nao foi possivel abrir a janela de impressao.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  async function carregarPedidos() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/list?filtro=${encodeURIComponent(filtro)}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        console.error("Falha ao carregar pedidos:", d?.error || res.statusText);
        setPedidos([]);
        return;
      }
      setPedidos((d.pedidos as Pedido[]) || []);
    } catch (e) {
      console.error("Erro de conexão ao listar pedidos:", e);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }

  async function sincronizarPendentesMP(showFeedback = false) {
    if (syncingMp) return;
    setSyncingMp(true);
    try {
      const res = await fetch("/api/admin/orders/list?filtro=pending&limit=50", {
        cache: "no-store",
      });
      const d = await res.json().catch(() => null);
      const pendentes: { id: string }[] = d?.ok ? d.pedidos : [];

      if (!pendentes.length) {
        if (showFeedback) alert("Nenhum pedido pendente para sincronizar.");
        return;
      }

      for (const pedido of pendentes) {
        await fetch("/api/orders/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: pedido.id }),
        }).catch(() => { /* segue para o próximo */ });
      }

      if (showFeedback) {
        alert("Sincronização com Mercado Pago finalizada.");
      }
    } finally {
      setSyncingMp(false);
    }
  }

  async function apagarPedidoAdmin(id: string) {
    if (!adminSecret.trim()) {
      alert("Informe o segredo de admin (ADMIN_ORDERS_SECRET) para apagar.");
      return;
    }
    if (!confirm("Apagar este pedido e itens vinculados?")) return;
    setProcessando(id);
    const res = await fetch("/api/admin/orders/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, secret: adminSecret.trim() }),
    });
    const data = await res.json().catch(() => null);
    setProcessando(null);
    if (!res.ok || !data?.ok) {
      alert(data?.error || "Erro ao apagar.");
      return;
    }
    await carregarPedidos();
  }

  async function apagarTodosPedidos() {
    if (!adminSecret.trim()) {
      alert("Informe o segredo de admin (ADMIN_ORDERS_SECRET).");
      return;
    }
    if (!confirm("ATENÇÃO: Isso apaga TODOS os pedidos do sistema. Continuar?")) return;
    setLimpando(true);
    try {
      const res = await fetch("/api/admin/orders/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: adminSecret.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Erro ao limpar pedidos.");
        return;
      }
      alert(`Pedidos removidos: ${data.removed ?? 0}`);
      await carregarPedidos();
    } finally {
      setLimpando(false);
    }
  }

  async function atualizarStatus(id: string, novoStatus: string) {
    setProcessando(id);
    try {
      const res = await fetch("/api/admin/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, novoStatus }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Erro ao atualizar status. Verifique os logs do Vercel.");
        return;
      }
      if (data?.estoqueCatalogoErro) {
        alert(`Status atualizado, mas a baixa do estoque do catálogo falhou:\n${data.estoqueCatalogoErro}`);
      }
      if (novoStatus === "entregue") {
        if (data?.estoqueErro) {
          alert(`Pedido marcado como entregue, mas o estoque automático do membro falhou:\n${data.estoqueErro}`);
        } else if (data?.estoque?.appliedLines > 0) {
          alert(
            `Estoque do salão do membro atualizado automaticamente (${data.estoque.appliedLines} produto(s) / linhas no estoque PRO).`
          );
        }
      }
    } catch (e: any) {
      alert("Erro de conexão: " + e.message);
      return;
    } finally {
      setProcessando(null);
    }
    await carregarPedidos();
  }

  const totalFiltrado = pedidos.reduce((acc, p) => acc + Number(p.total), 0);

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: "abandonados", label: "Abandonados" },
    { key: "pending",     label: "Pendentes" },
    { key: "paid",        label: "Pagos" },
    { key: "separacao",   label: "Em Separação" },
    { key: "despachado",  label: "Despachados" },
    { key: "entregue",    label: "Entregues" },
    { key: "cancelled",   label: "Cancelados" },
    { key: "todos",       label: "Todos" },
  ];

  useEffect(() => {
    const t = setTimeout(async () => {
      await sincronizarPendentesMP(false);
      await carregarPedidos();
    }, 5000);
    return () => clearTimeout(t);
  }, [filtro]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-8">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black italic uppercase">
              Pedidos <span className="text-[#C9A66B]">da Loja</span>
            </h1>
            <p className="text-zinc-500 text-xs mt-1">
              {pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""} —{" "}
              <span className="text-white font-bold">
                R$ {totalFiltrado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/pedidos/manual"
              className="flex items-center gap-2 bg-[#C9A66B] text-black font-black uppercase text-xs tracking-widest px-4 py-2 rounded-xl hover:bg-[#B89559] transition-colors"
            >
              <Plus size={14} /> Pedido manual
            </Link>
            <button onClick={carregarPedidos} className="text-zinc-500 hover:text-white transition-colors" aria-label="Recarregar">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await sincronizarPendentesMP(true);
              await carregarPedidos();
            }}
            disabled={syncingMp}
            className="bg-blue-950/30 border border-blue-700/40 hover:border-blue-500/60 text-blue-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            {syncingMp ? "Sincronizando MP..." : "Sincronizar pagamentos MP"}
          </button>
        </div>

        {/* Diagnóstico — buscar cliente por nome/e-mail */}
        <div className="mb-6 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
            <UserSearch size={12} /> Buscar cliente (vê pedidos em qualquer status + carrinho)
          </p>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void buscarCliente(); }}
                placeholder="Ex.: Silvia Cristina, silvia@gmail.com…"
                className="w-full bg-black border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]"
              />
            </div>
            <button
              onClick={buscarCliente}
              disabled={diagLoading}
              className="bg-[#C9A66B] hover:bg-[#B89559] text-black font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {diagLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
            </button>
          </div>

          {diagResultados.length > 0 && (
            <div className="mt-4 space-y-3">
              {diagResultados.map((c) => {
                const linkManual = c.carrinho?.items?.length
                  ? `/admin/pedidos/manual?cliente=${c.id}&itens=${encodeURIComponent(c.carrinho.items.map((i) => `${i.id}:${i.quantity}:${i.price}`).join(","))}`
                  : `/admin/pedidos/manual?cliente=${c.id}`;
                return (
                  <div key={c.id} className="rounded-xl border border-zinc-800 bg-black/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="font-bold text-white">{c.full_name || "(sem nome)"}</p>
                        <p className="text-[10px] text-zinc-500">
                          {c.email || "—"} · {c.role || "—"}
                          {c.last_sign_in_at && ` · Último acesso ${new Date(c.last_sign_in_at).toLocaleString("pt-BR")}`}
                        </p>
                      </div>
                      <Link
                        href={linkManual}
                        className="text-[10px] font-black uppercase tracking-widest bg-[#C9A66B] hover:bg-[#B89559] text-black px-3 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        <Plus size={11} /> Criar pedido manual
                      </Link>
                    </div>

                    {c.carrinho && (c.carrinho.items?.length || 0) > 0 && (
                      <div className="mb-3 rounded-lg border border-amber-700/30 bg-amber-900/10 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-1">
                          Carrinho abandonado · R$ {Number(c.carrinho.subtotal || 0).toFixed(2)} · status: {c.carrinho.status}
                        </p>
                        {c.carrinho.items?.map((i, ix) => (
                          <p key={ix} className="text-[11px] text-zinc-400">
                            • {i.title} × {i.quantity} — R$ {(Number(i.price) * Number(i.quantity)).toFixed(2)}
                          </p>
                        ))}
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                        {c.pedidos.length === 0 ? "Nenhum pedido criado no banco" : `${c.pedidos.length} pedido(s) no banco`}
                      </p>
                      {c.pedidos.length === 0 ? (
                        <p className="text-[11px] text-amber-400">
                          ⚠ Cliente nunca conseguiu finalizar checkout — provavelmente travou na hora de pagar (frete, etc).
                          Use o botão acima para criar manualmente.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {c.pedidos.map((p) => (
                            <div key={p.id} className="text-[11px] flex flex-wrap items-center gap-2 bg-zinc-900/60 rounded-lg px-3 py-2 border border-zinc-800">
                              <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[9px] tracking-widest border ${(STATUS[p.status] || STATUS.pending).style}`}>
                                {(STATUS[p.status] || STATUS.pending).label}
                              </span>
                              <span className="text-zinc-400">
                                {new Date(p.created_at).toLocaleString("pt-BR")}
                              </span>
                              <span className="text-white font-bold">R$ {Number(p.total || 0).toFixed(2)}</span>
                              <span className="text-zinc-500">via {pagamentoLabel(p.payment_method)}</span>
                              {p.mp_payment_id && <span className="text-zinc-500 font-mono">MP #{p.mp_payment_id}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!diagLoading && diagResultados.length === 0 && buscaCliente.trim().length >= 2 && (
            <p className="text-xs text-zinc-500 mt-3">Clique em "Buscar" para procurar.</p>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                filtro === f.key
                  ? "bg-[#C9A66B] text-black border-[#C9A66B]"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Limpeza / pedidos de teste — requer ADMIN_ORDERS_SECRET no servidor */}
        <div className="mb-8 p-4 rounded-2xl border border-red-900/40 bg-red-950/20 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
            Zona perigosa — apagar pedidos
          </p>
          <p className="text-xs text-zinc-500">
            Defina <code className="text-zinc-400">ADMIN_ORDERS_SECRET</code> no Vercel (e local no{" "}
            <code className="text-zinc-400">.env.local</code>) e cole o mesmo valor abaixo para confirmar exclusões.
          </p>
          <input
            type="password"
            autoComplete="off"
            placeholder="Segredo admin (ADMIN_ORDERS_SECRET)"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            className="w-full max-w-md bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
          />
          <button
            type="button"
            onClick={apagarTodosPedidos}
            disabled={limpando}
            className="flex items-center gap-2 bg-red-900/50 hover:bg-red-800/60 text-red-200 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl border border-red-800/60 disabled:opacity-50"
          >
            {limpando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Zerar todos os pedidos (banco)
          </button>
        </div>

        {/* Carrinhos abandonados */}
        {filtro === "abandonados" ? (
          loadingCarrinhos ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
            </div>
          ) : carrinhos.length === 0 ? (
            <div className="text-center py-20 text-zinc-600">
              <AlertTriangle size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-bold uppercase tracking-widest text-sm">Nenhum carrinho abandonado</p>
              <p className="text-xs text-zinc-500 mt-2 max-w-md mx-auto leading-relaxed">
                Aqui aparecem os clientes logados que adicionaram produtos ao carrinho e não finalizaram a compra.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-zinc-500">
                Clique em <span className="text-[#C9A66B] font-bold">Finalizar venda</span> para criar o pedido manualmente — comissão é gerada do mesmo jeito.
              </p>
              {carrinhos.map((c) => {
                const itensCount = c.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
                const itensQuery = (c.items || [])
                  .map((i) => `${i.id}:${i.quantity}:${i.price}`)
                  .join(",");
                const linkManual = `/admin/pedidos/manual?cliente=${c.profile_id}&itens=${encodeURIComponent(itensQuery)}`;
                return (
                  <div key={c.profile_id} className="bg-zinc-900/50 border border-amber-700/30 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <AdminMemberAvatar
                          avatarUrl={c.profiles?.avatar_url || null}
                          name={c.profiles?.full_name || ""}
                          className="rounded-lg border-amber-500/25 bg-amber-500/10 text-amber-400"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{c.profiles?.full_name || "—"}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                            {c.profiles?.role || "—"} · Atualizado {new Date(c.updated_at).toLocaleString("pt-BR")}
                          </p>
                          {c.profiles?.email && (
                            <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                              <Mail size={10} /> {c.profiles.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                        <p className="text-2xl font-black text-white">
                          R$ {Number(c.subtotal || 0).toFixed(2)}
                        </p>
                        <span className="text-[10px] font-black uppercase tracking-widest border px-3 py-1 rounded-full bg-amber-900/30 text-amber-300 border-amber-700/40">
                          {itensCount} {itensCount === 1 ? "item" : "itens"} no carrinho
                        </span>
                      </div>
                    </div>

                    {c.items?.length > 0 && (
                      <div className="border-t border-zinc-800 pt-3">
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Itens</p>
                        <div className="flex flex-col gap-1">
                          {c.items.map((i, ix) => (
                            <div key={ix} className="flex justify-between text-xs text-zinc-400">
                              <span className="truncate">{i.title || "Produto"} × {i.quantity}</span>
                              <span>R$ {(Number(i.price || 0) * Number(i.quantity || 0)).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-zinc-800 pt-3 flex flex-wrap gap-2 items-center">
                      <Link
                        href={linkManual}
                        className="flex items-center gap-1 bg-[#C9A66B] hover:bg-[#B89559] text-black font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all"
                      >
                        <CheckCircle size={14} /> Finalizar venda
                      </Link>
                      {c.profiles?.email && (
                        <a
                          href={`mailto:${c.profiles.email}?subject=Sobre seu pedido na Masc PRO&body=Olá ${c.profiles.full_name || ""}, vi que você deixou itens no carrinho — posso te ajudar a finalizar?`}
                          className="flex items-center gap-1 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 font-bold uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl border border-blue-800/40"
                        >
                          <Mail size={14} /> Enviar e-mail
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => descartarCarrinho(c.profile_id)}
                        className="flex items-center gap-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl border border-red-800/40"
                      >
                        <Trash2 size={14} /> Descartar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-20 text-zinc-600">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold uppercase tracking-widest text-sm">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pedidos.map(pedido => {
              const statusInfo = STATUS[pedido.status] || STATUS.pending;
              const isProcessando = processando === pedido.id;

              return (
                <div
                  key={pedido.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4"
                >
                  {/* Linha principal */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

                    {/* Info do comprador */}
                    <div className="flex items-start gap-4 flex-1">
                      <AdminMemberAvatar
                        avatarUrl={pedido.profiles?.avatar_url}
                        name={pedido.profiles?.full_name}
                        className="rounded-lg border-[#C9A66B]/25 bg-[#C9A66B]/15 text-[#C9A66B]"
                      />
                      <div>
                        <p className="font-bold text-white">{pedido.profiles?.full_name || "—"}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                          {pedido.profiles?.nivel || "cabeleireiro"} · {new Date(pedido.created_at).toLocaleDateString("pt-BR")}
                        </p>
                        {pedido.mp_payment_id && (
                          <p className="text-[10px] text-zinc-600 font-mono mt-1">MP #{pedido.mp_payment_id}</p>
                        )}
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Pagamento: <span className="text-zinc-400">{pagamentoLabel(pedido.payment_method)}</span>
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Frete: <span className="text-zinc-400">R$ {Number(pedido.shipping_cost || 0).toFixed(2)}</span>
                          {pedido.shipping_cep ? ` · CEP ${pedido.shipping_cep}` : ""}
                        </p>
                        {pedido.shipping_address && (
                          <p className="text-[10px] text-zinc-500 mt-1 max-w-2xl leading-relaxed">
                            Envio: {pedido.shipping_address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Total + status */}
                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                      <p className="text-2xl font-black text-white">
                        R$ {Number(pedido.total).toFixed(2)}
                      </p>
                      <span className={`text-[10px] font-black uppercase tracking-widest border px-3 py-1 rounded-full ${statusInfo.style}`}>
                        {statusInfo.icon}{statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Itens do pedido */}
                  {pedido.order_items?.length > 0 && (
                    <div className="border-t border-zinc-800 pt-3">
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Itens</p>
                      <div className="flex flex-col gap-1">
                        {pedido.order_items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-zinc-400">
                            <span>{item.products?.title || "Produto"} × {item.quantidade}</span>
                            <span>R$ {(Number(item.preco_unitario) * item.quantidade).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações de status */}
                  <div className="border-t border-zinc-800 pt-3 flex flex-wrap gap-2 items-center">

                    <button
                      type="button"
                      onClick={() => setEditarPedidoId(pedido.id)}
                      disabled={isProcessando}
                      className="flex items-center gap-1 bg-[#C9A66B]/20 hover:bg-[#C9A66B]/35 text-[#C9A66B] font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50 border border-[#C9A66B]/40"
                    >
                      <Pencil size={14} /> Editar pedido
                    </button>

                    <button
                      type="button"
                      onClick={() => apagarPedidoAdmin(pedido.id)}
                      disabled={isProcessando}
                      className="flex items-center gap-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50 border border-red-800/40"
                    >
                      {isProcessando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Apagar pedido
                    </button>

                    <button
                      type="button"
                      onClick={() => imprimirLogisticaPdf(pedido)}
                      className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all border border-zinc-700"
                    >
                      Imprimir PDF logistica
                    </button>

                    {/* PENDENTE / NOVO → confirmar pagamento ou cancelar */}
                    {(pedido.status === "pending" || pedido.status === "novo") && (
                      <>
                        <button
                          onClick={() => atualizarStatus(pedido.id, "paid")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-blue-700/40 hover:bg-blue-600/60 text-blue-200 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50 border border-blue-600/40"
                        >
                          {isProcessando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          CONFIRMAR PAGAMENTO
                        </button>
                        <button
                          onClick={() => atualizarStatus(pedido.id, "cancelled")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                          <XCircle size={14} /> CANCELAR
                        </button>
                      </>
                    )}

                    {/* PAGO → pode ir para separação, emitir NF-e ou cancelar */}
                    {pedido.status === "paid" && (
                      <>
                        <button
                          onClick={() => atualizarStatus(pedido.id, "separacao")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-yellow-900/40 hover:bg-yellow-800/60 text-yellow-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                          {isProcessando ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
                          SEPARAÇÃO
                        </button>
                        <button
                          onClick={() => { setModalNfe(pedido); setNfeForm({ cpf_cnpj: "", observacao: "" }); setNfeResultado(null); }}
                          className="flex items-center gap-1 bg-blue-900/30 hover:bg-blue-800/40 text-blue-300 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all"
                        >
                          <FileText size={14} /> NF-e
                        </button>
                        <button
                          onClick={() => atualizarStatus(pedido.id, "cancelled")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-red-900/30 hover:bg-red-800/40 text-red-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                          <XCircle size={14} /> CANCELAR
                        </button>
                      </>
                    )}

                    {/* SEPARAÇÃO → pode despachar ou cancelar */}
                    {pedido.status === "separacao" && (
                      <>
                        <button
                          onClick={() => {
                            setModalTracking(pedido);
                            setTracking({ codigo: pedido.codigo_rastreio || "", transportadora: pedido.transportadora || "", previsao: pedido.data_previsao || "" });
                          }}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-green-900/40 hover:bg-green-800/60 text-green-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                          <Truck size={14} /> DESPACHAR
                        </button>
                        <button
                          onClick={() => atualizarStatus(pedido.id, "paid")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                          ← VOLTAR PARA PAGO
                        </button>
                      </>
                    )}

                    {pedido.status === "despachado" && (
                      <>
                        <button
                          type="button"
                          onClick={() => atualizarStatus(pedido.id, "entregue")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-300 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50 border border-emerald-800/40"
                        >
                          {isProcessando ? <Loader2 size={14} className="animate-spin" /> : <PackageOpen size={14} />}
                          ENTREGUE (+ estoque)
                        </button>
                        <span className="text-[10px] text-zinc-500 max-w-[200px] leading-tight">
                          Ou o membro confirma em Meus pedidos — nos dois casos o estoque do salão é creditado uma vez.
                        </span>
                      </>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── Modal NF-e ─── */}
      {modalNfe && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="font-black uppercase text-sm tracking-widest text-white flex items-center gap-2">
                  <FileText size={16} className="text-blue-400" /> Emitir NF-e
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">{modalNfe.profiles?.full_name} — {modalNfe.total ? Number(modalNfe.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""}</p>
              </div>
              <button onClick={() => { setModalNfe(null); setNfeResultado(null); }}><XCircle size={20} className="text-zinc-500 hover:text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Resultado */}
              {nfeResultado && (
                <div className={`rounded-xl px-4 py-3 text-sm font-bold ${nfeResultado.erro ? "bg-red-500/10 border border-red-500/30 text-red-400" : "bg-green-500/10 border border-green-500/30 text-green-400"}`}>
                  {nfeResultado.erro ? (
                    <p>❌ {nfeResultado.erro}</p>
                  ) : (
                    <div className="space-y-1">
                      <p>✅ NF-e emitida com sucesso!</p>
                      <p className="text-xs font-normal text-green-300">Número: <strong>{nfeResultado.numero}</strong></p>
                      {nfeResultado.chave && <p className="text-[10px] font-mono text-green-300 break-all">{nfeResultado.chave}</p>}
                    </div>
                  )}
                </div>
              )}

              {!nfeResultado && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">CPF ou CNPJ do cliente *</label>
                    <input
                      value={nfeForm.cpf_cnpj}
                      onChange={e => setNfeForm(f => ({ ...f, cpf_cnpj: e.target.value }))}
                      placeholder="000.000.000-00 ou 00.000.000/0001-00"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]"
                    />
                    <p className="text-[10px] text-zinc-600 mt-1">Se o cliente já tem CPF/CNPJ cadastrado no perfil, será salvo automaticamente.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Observação (opcional)</label>
                    <textarea
                      value={nfeForm.observacao}
                      onChange={e => setNfeForm(f => ({ ...f, observacao: e.target.value }))}
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B] resize-none"
                      placeholder="Informações adicionais para a NF-e..."
                    />
                  </div>
                  <div className="bg-zinc-900 rounded-xl p-3">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Requisitos</p>
                    <ul className="text-[10px] text-zinc-600 space-y-0.5">
                      <li>• <span className="text-zinc-400">BLING_API_TOKEN</span> configurado no .env</li>
                      <li>• Todos os produtos precisam ter o <span className="text-zinc-400">ID Bling</span> (Admin → Produtos)</li>
                      <li>• Endereço do cliente cadastrado no perfil</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => emitirNfe(modalNfe.id)}
                    disabled={emitindoNfe || !nfeForm.cpf_cnpj.replace(/\D/g, "")}
                    className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    {emitindoNfe ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                    {emitindoNfe ? "Emitindo via Bling..." : "Emitir NF-e"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Tracking ─── */}
      {modalTracking && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="font-black uppercase text-sm tracking-widest text-white">Despachar Pedido</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">{modalTracking.profiles?.full_name}</p>
              </div>
              <button onClick={() => setModalTracking(null)}><XCircle size={20} className="text-zinc-500 hover:text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Transportadora</label>
                <input
                  value={tracking.transportadora}
                  onChange={e => setTracking(t => ({ ...t, transportadora: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]"
                  placeholder="Correios, Jadlog, Total Express..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Código de Rastreio</label>
                <input
                  value={tracking.codigo}
                  onChange={e => setTracking(t => ({ ...t, codigo: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B] font-mono"
                  placeholder="AA000000000BR"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Previsão de Entrega</label>
                <input
                  type="date"
                  value={tracking.previsao}
                  onChange={e => setTracking(t => ({ ...t, previsao: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]"
                />
              </div>
              <button
                onClick={() => salvarTracking(modalTracking.id)}
                disabled={salvandoTracking}
                className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2"
              >
                {salvandoTracking ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                Confirmar Despacho
              </button>
            </div>
          </div>
        </div>
      )}

      {editarPedidoId && (
        <EditarPedidoModal
          orderId={editarPedidoId}
          onClose={() => setEditarPedidoId(null)}
          onSaved={() => void carregarPedidos()}
        />
      )}
    </div>
  );
}
