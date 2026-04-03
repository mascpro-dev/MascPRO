"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import AdminMemberAvatar from "@/componentes/AdminMemberAvatar";
import {
  Loader2,
  Users,
  CalendarDays,
  Wallet,
  Package,
  MessageCircle,
  ExternalLink,
  Search,
  Store,
  ClipboardList,
  Boxes,
  History,
} from "lucide-react";

type ProfissionalOpt = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  role?: string | null;
  avatar_url?: string | null;
};

type ClienteRow = { id: string; name: string; phone: string | null; birthday: string | null };

type AptRow = {
  id: string;
  client_name: string;
  client_phone: string | null;
  service: string | null;
  appointment_time: string;
  duration_min: number;
  status: string;
  price: number | null;
  client_id?: string | null;
};

function waLink(phone: string, text: string) {
  const tel = String(phone || "").replace(/\D/g, "");
  if (tel.length < 8) return "";
  const f = tel.startsWith("55") ? tel : `55${tel}`;
  return `https://wa.me/${f}?text=${encodeURIComponent(text)}`;
}

function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminGestaoRedePage() {
  const [profissionais, setProfissionais] = useState<ProfissionalOpt[]>([]);
  const [pid, setPid] = useState("");
  const [dia, setDia] = useState(() => new Date().toISOString().slice(0, 10));
  const [busca, setBusca] = useState("");
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingDet, setLoadingDet] = useState(false);
  const [err, setErr] = useState("");
  const [msgCliente, setMsgCliente] = useState(
    "Olá! Aqui é a equipe MascPRO. Qualquer dúvida, estamos à disposição."
  );

  const [snap, setSnap] = useState<{
    profissional: ProfissionalOpt & {
      instagram?: string | null;
      city?: string | null;
      state?: string | null;
      avatar_url?: string | null;
    };
    agenda: AptRow[];
    clientes: { total: number; lista: ClienteRow[] };
    servicosCadastrados: number;
    financeiro: { receitaMes: number; despesasMes: number; lucroMes: number; cobrancasAberto: number };
    mes: string;
    comprasLoja: { id: string; total: number; status: string; created_at: string }[];
    itensCompras: { order_id: string; quantidade: number; preco_unitario: number; titulo: string }[];
    catalogoPlataforma: { id: string; title: string; stock: number; ativo: boolean }[];
    estoqueSalao: {
      id: string;
      name: string;
      category: string;
      quantity: number;
      unit: string;
      min_quantity: number | null;
      product_id: string | null;
      notes: string | null;
      updated_at?: string;
    }[];
    estoqueOrigemPedidos?: {
      id: string;
      order_id: string | null;
      order_ref: string | null;
      product_title: string;
      item_name: string;
      quantity_delta: number;
      reason: string;
      created_at: string;
    }[];
  } | null>(null);

  const carregarLista = useCallback(async () => {
    setLoadingLista(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/master/gestao", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setErr(d.error || "Sem permissão ou erro ao carregar.");
        setProfissionais([]);
        return;
      }
      setProfissionais(d.profissionais || []);
    } finally {
      setLoadingLista(false);
    }
  }, []);

  const carregarDetalhe = useCallback(async () => {
    if (!pid) {
      setSnap(null);
      return;
    }
    setLoadingDet(true);
    setErr("");
    try {
      const r = await fetch(`/api/admin/master/gestao?profissionalId=${encodeURIComponent(pid)}&dia=${encodeURIComponent(dia)}`, {
        cache: "no-store",
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setErr(d.error || "Erro ao carregar visão do profissional.");
        setSnap(null);
        return;
      }
      setSnap(d);
    } finally {
      setLoadingDet(false);
    }
  }, [pid, dia]);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  useEffect(() => {
    void carregarDetalhe();
  }, [carregarDetalhe]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return profissionais;
    return profissionais.filter(
      (p) =>
        (p.full_name || "").toLowerCase().includes(t) ||
        (p.email || "").toLowerCase().includes(t) ||
        (p.whatsapp || "").includes(t)
    );
  }, [profissionais, busca]);

  const itensPorPedido = useMemo(() => {
    type ItemCompra = { order_id: string; quantidade: number; preco_unitario: number; titulo: string };
    if (!snap?.itensCompras?.length) return new Map<string, ItemCompra[]>();
    const m = new Map<string, ItemCompra[]>();
    for (const it of snap.itensCompras) {
      if (!m.has(it.order_id)) m.set(it.order_id, []);
      m.get(it.order_id)!.push(it);
    }
    return m;
  }, [snap]);

  const inputClass =
    "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 pt-20 md:pt-8 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight">
              Gestão <span className="text-[#C9A66B]">PRO — Master</span>
            </h1>
            <p className="text-zinc-500 text-xs mt-1">
              Visão consolidada da agenda, clientes, loja e financeiro de cada membro (somente administradores).
            </p>
          </div>

          {err && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300 font-bold">{err}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Profissional</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                <input
                  type="search"
                  placeholder="Filtrar lista..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>
              {loadingLista ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-[#C9A66B]" />
                </div>
              ) : (
                <select value={pid} onChange={(e) => setPid(e.target.value)} className={inputClass}>
                  <option value="">Selecione um membro…</option>
                  {filtrados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {(p.full_name || "Sem nome") + (p.email ? ` — ${p.email}` : "")}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={labelClass}>Dia da agenda</label>
              <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className={inputClass} style={{ colorScheme: "dark" }} />
            </div>
          </div>

          {loadingDet && pid && (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
            </div>
          )}

          {!loadingDet && snap && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-wrap gap-4 items-start justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <AdminMemberAvatar
                    avatarUrl={snap.profissional.avatar_url}
                    name={snap.profissional.full_name}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                  <p className="text-lg font-black text-white">{snap.profissional.full_name}</p>
                  <p className="text-xs text-zinc-500">{snap.profissional.email}</p>
                  <p className="text-[10px] text-zinc-600 mt-1 uppercase">
                    {snap.profissional.role} · {snap.profissional.city || "—"} {snap.profissional.state || ""}
                  </p>
                  </div>
                </div>
                {snap.profissional.whatsapp && (
                  <a
                    href={waLink(snap.profissional.whatsapp, "Olá! Aqui é o suporte MascPRO.")}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-3 py-2 rounded-xl"
                  >
                    <MessageCircle size={14} /> WhatsApp do profissional
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase mb-2">
                    <CalendarDays size={14} className="text-[#C9A66B]" /> Agenda hoje
                  </div>
                  <p className="text-2xl font-black text-white">{snap.agenda.length}</p>
                  <p className="text-[10px] text-zinc-600">Compromissos no dia selecionado</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase mb-2">
                    <Users size={14} className="text-[#C9A66B]" /> Clientes cadastrados
                  </div>
                  <p className="text-2xl font-black text-white">{snap.clientes.total}</p>
                  <p className="text-[10px] text-zinc-600">Base pró (agenda)</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase mb-2">
                    <ClipboardList size={14} className="text-[#C9A66B]" /> Serviços no catálogo
                  </div>
                  <p className="text-2xl font-black text-white">{snap.servicosCadastrados}</p>
                  <p className="text-[10px] text-zinc-600">Procedimentos ativos</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase mb-2">
                    <Wallet size={14} className="text-[#C9A66B]" /> Lucro (mês {snap.mes})
                  </div>
                  <p className="text-2xl font-black text-emerald-400">{fmtMoney(snap.financeiro.lucroMes)}</p>
                  <p className="text-[10px] text-zinc-600">Receita paga − despesas</p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-3 flex items-center gap-2">
                  <Wallet size={14} /> Financeiro simples — {snap.mes}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase">Receita (paga no mês)</p>
                    <p className="font-black text-emerald-400">{fmtMoney(snap.financeiro.receitaMes)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase">Despesas</p>
                    <p className="font-black text-red-300">{fmtMoney(snap.financeiro.despesasMes)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase">Cobranças em aberto</p>
                    <p className="font-black text-amber-300">{fmtMoney(snap.financeiro.cobrancasAberto)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-3 flex items-center gap-2">
                  <CalendarDays size={14} /> Agenda — {dia}
                </h3>
                {snap.agenda.length === 0 ? (
                  <p className="text-zinc-500 text-sm">Nenhum horário neste dia.</p>
                ) : (
                  <ul className="space-y-2">
                    {snap.agenda.map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap justify-between gap-2 text-sm border border-zinc-800/80 rounded-xl px-3 py-2 bg-black/20"
                      >
                        <div>
                          <span className="font-bold text-white">{String(a.appointment_time || "").slice(0, 5)}</span>
                          <span className="text-zinc-500"> · </span>
                          <span>{a.client_name}</span>
                          {a.service && <p className="text-[10px] text-zinc-500">{a.service}</p>}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-zinc-500">{a.status}</span>
                          {a.price != null && <p className="text-[#C9A66B] font-bold">{fmtMoney(Number(a.price))}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-3 flex items-center gap-2">
                  <Store size={14} /> Loja MascPRO — pedidos do membro
                </h3>
                {snap.comprasLoja.length === 0 ? (
                  <p className="text-zinc-500 text-sm">Nenhum pedido registrado.</p>
                ) : (
                  <ul className="space-y-3">
                    {snap.comprasLoja.map((o) => (
                      <li key={o.id} className="border border-zinc-800 rounded-xl p-3 bg-black/20">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                          <span className="font-black text-white">{fmtMoney(Number(o.total || 0))}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 uppercase mt-1">{o.status}</p>
                        <ul className="mt-2 text-[11px] text-zinc-400 list-disc list-inside">
                          {(itensPorPedido.get(o.id) || []).map((it, i) => (
                            <li key={i}>
                              {it.titulo} × {it.quantidade}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-2 flex items-center gap-2">
                  <Boxes size={14} className="text-[#C9A66B]" /> Estoque do salão (por membro)
                </h3>
                <p className="text-[10px] text-zinc-600 mb-3 leading-snug">
                  Itens que o profissional cadastrou na Gestão PRO (aba Estoque). Compras na loja com status{" "}
                  <span className="text-emerald-400/90 font-bold">entregue</span> somam automaticamente aqui quando ele
                  confirma o recebimento (produtos vinculados ao catálogo).
                </p>
                {(snap.estoqueSalao || []).length === 0 ? (
                  <p className="text-zinc-500 text-sm">Nenhum item no estoque do salão.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {(snap.estoqueSalao || []).map((it) => {
                      const baixo =
                        it.min_quantity != null && Number(it.quantity) <= Number(it.min_quantity);
                      return (
                        <div
                          key={it.id}
                          className={`flex flex-wrap items-start justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                            baixo ? "border-amber-700/50 bg-amber-950/20" : "border-zinc-800/80 bg-black/20"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{it.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">{it.category}</p>
                            {it.product_id && (
                              <p className="text-[9px] text-cyan-600/90 mt-0.5">Vinculado à loja MascPRO</p>
                            )}
                            {it.notes && <p className="text-[10px] text-zinc-600 mt-1 line-clamp-2">{it.notes}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-black ${baixo ? "text-amber-400" : "text-emerald-400"}`}>
                              {Number(it.quantity)} <span className="text-zinc-500 font-bold">{it.unit}</span>
                            </p>
                            {it.min_quantity != null && (
                              <p className="text-[9px] text-zinc-600">Mín. {Number(it.min_quantity)}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-2 flex items-center gap-2">
                  <History size={14} className="text-cyan-500/90" /> Origem no estoque (pedidos entregues)
                </h3>
                <p className="text-[10px] text-zinc-600 mb-3 leading-snug">
                  Cada linha mostra quanto entrou no estoque do salão e de qual pedido da loja veio (após marcar{" "}
                  <span className="text-emerald-400/90 font-bold">entregue</span>). ID completo do pedido ao passar o
                  mouse em &quot;Pedido&quot;.
                </p>
                {(snap.estoqueOrigemPedidos || []).length === 0 ? (
                  <p className="text-zinc-500 text-sm">
                    Nenhum registro ainda. Rode o SQL <span className="text-zinc-400 font-mono text-[10px]">pro_inventory_movements.sql</span> no
                    Supabase se acabou de ativar esta função.
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {(snap.estoqueOrigemPedidos || []).map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-zinc-800/80 bg-black/20 px-3 py-2 text-[11px]"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-white">
                            +{row.quantity_delta} <span className="text-zinc-500 font-normal">·</span>{" "}
                            <span className="text-zinc-300">{row.product_title}</span>
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Item estoque: {row.item_name}</p>
                          {row.order_id ? (
                            <p className="text-[10px] text-cyan-600/90 mt-1 font-mono" title={row.order_id}>
                              Pedido {row.order_ref}
                            </p>
                          ) : (
                            <p className="text-[10px] text-zinc-600 mt-1">Sem pedido vinculado</p>
                          )}
                        </div>
                        <span className="text-[9px] text-zinc-600 shrink-0">
                          {new Date(row.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-2 flex items-center gap-2">
                  <Package size={14} /> Estoque catálogo MascPRO (global)
                </h3>
                <p className="text-[10px] text-zinc-600 mb-3">
                  Mesmos produtos da loja para todos os membros; útil para acompanhar disponibilidade geral.
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {snap.catalogoPlataforma.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Sem produtos ativos.</p>
                  ) : (
                    snap.catalogoPlataforma.map((p) => (
                      <div key={p.id} className="flex justify-between text-xs py-1 border-b border-zinc-800/60">
                        <span className="text-zinc-300 truncate pr-2">{p.title}</span>
                        <span className="text-[#C9A66B] font-black shrink-0">{p.stock} un.</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/10 p-4">
                <h3 className="text-xs font-black uppercase text-emerald-400 tracking-widest mb-2 flex items-center gap-2">
                  <MessageCircle size={14} /> Mensagem aos clientes (WhatsApp)
                </h3>
                <p className="text-[10px] text-zinc-500 mb-3">
                  Abre o WhatsApp Web/App com o texto abaixo. O envio é feito pela sua conta conectada.
                </p>
                <textarea
                  value={msgCliente}
                  onChange={(e) => setMsgCliente(e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none mb-3`}
                />
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {snap.clientes.lista.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Sem clientes com cadastro.</p>
                  ) : (
                    snap.clientes.lista.map((c) => {
                      const href = c.phone ? waLink(c.phone, msgCliente) : "";
                      return (
                        <div
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-zinc-800/60 text-sm"
                        >
                          <div>
                            <p className="font-bold text-white">{c.name}</p>
                            <p className="text-[10px] text-zinc-500">{c.phone || "Sem telefone"}</p>
                          </div>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/40 px-2 py-1.5 rounded-lg border border-emerald-800/50"
                            >
                              <ExternalLink size={12} /> Enviar
                            </a>
                          ) : (
                            <span className="text-[10px] text-zinc-600">Sem WhatsApp</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
