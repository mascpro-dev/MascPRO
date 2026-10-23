"use client";

import { useState } from "react";
import { AlertCircle, Loader2, ShoppingBag, UserPlus } from "lucide-react";
import CrmFechamentoPedidoModal from "@/componentes/CrmFechamentoPedidoModal";
import CrmRedePicker, { type ContatoRedeCrm } from "@/componentes/CrmRedePicker";

type LeadPedido = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  profile_id: string | null;
};

type Props = {
  onFechou?: () => void;
  /** Embutido na página (padrão) ou compacto */
  variante?: "pagina" | "compacto";
};

export default function CrmNovoPedidoFlow({ onFechou, variante = "pagina" }: Props) {
  const [passo, setPasso] = useState<"buscar" | "manual">("buscar");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");
  const [leadPedido, setLeadPedido] = useState<LeadPedido | null>(null);
  const [manual, setManual] = useState({
    nome: "",
    telefone: "",
    email: "",
    cidade: "",
  });

  function resetForm() {
    setPasso("buscar");
    setErro("");
    setManual({ nome: "", telefone: "", email: "", cidade: "" });
  }

  async function prepararLead(dados: {
    nome: string;
    telefone?: string | null;
    email?: string | null;
    cidade?: string | null;
    estado?: string | null;
    profile_id?: string | null;
    crm_lead_id?: string | null;
    order_id?: string | null;
  }) {
    setCriando(true);
    setErro("");
    try {
      let leadId = dados.crm_lead_id || null;

      // Cliente que já fechou pedido → abre lead de nova compra
      if (leadId && dados.order_id) {
        const resNova = await fetch(`/api/admin/crm/leads/${leadId}/nova-compra`, {
          method: "POST",
        });
        const dNova = await resNova.json().catch(() => null);
        if (!resNova.ok || !dNova?.ok) {
          setErro(dNova?.error || "Não foi possível abrir nova compra para este cliente.");
          return;
        }
        leadId = dNova.lead.id;
        setLeadPedido({
          id: leadId!,
          nome: dados.nome,
          email: dados.email || null,
          telefone: dados.telefone || null,
          cidade: dados.cidade || null,
          estado: dados.estado || null,
          profile_id: dados.profile_id || null,
        });
        return;
      }

      if (!leadId) {
        const res = await fetch("/api/admin/crm/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: dados.nome,
            telefone: dados.telefone || null,
            email: dados.email || null,
            cidade: dados.cidade || null,
            estado: dados.estado || null,
            origem: "manual",
            perfil: "cabeleireiro",
            status: "novo",
            proximo_passo: "Lançamento de pedido",
            profile_id: dados.profile_id || null,
          }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok || !d?.ok) {
          setErro(d?.error || "Não foi possível criar o cliente do pedido.");
          return;
        }
        leadId = d.lead.id;

        if (dados.profile_id && !d.lead.profile_id) {
          await fetch(`/api/admin/crm/leads/${d.lead.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile_id: dados.profile_id }),
          }).catch(() => null);
        }

        setLeadPedido({
          id: d.lead.id,
          nome: d.lead.nome,
          email: d.lead.email,
          telefone: d.lead.telefone,
          cidade: d.lead.cidade,
          estado: d.lead.estado,
          profile_id: dados.profile_id || d.lead.profile_id || null,
        });
      } else {
        setLeadPedido({
          id: leadId,
          nome: dados.nome,
          email: dados.email || null,
          telefone: dados.telefone || null,
          cidade: dados.cidade || null,
          estado: dados.estado || null,
          profile_id: dados.profile_id || null,
        });
      }
    } finally {
      setCriando(false);
    }
  }

  async function selecionarContato(c: ContatoRedeCrm) {
    await prepararLead({
      nome: c.nome,
      telefone: c.telefone,
      email: c.email,
      cidade: c.cidade,
      estado: c.estado,
      profile_id: c.profile_id,
      crm_lead_id: c.crm_lead_id,
      order_id: c.order_id,
    });
  }

  async function salvarManual() {
    if (!manual.nome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    await prepararLead({
      nome: manual.nome.trim(),
      telefone: manual.telefone.trim() || null,
      email: manual.email.trim() || null,
      cidade: manual.cidade.trim() || null,
    });
  }

  const cardClass =
    variante === "pagina"
      ? "bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg"
      : "bg-zinc-950 border border-zinc-800 rounded-2xl w-full";

  return (
    <>
      <div className={cardClass}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/15 flex items-center justify-center shrink-0">
            <ShoppingBag size={18} className="text-[#C9A66B]" />
          </div>
          <div>
            <h2 className="font-black uppercase text-sm tracking-widest text-white">
              Lançar <span className="text-[#C9A66B]">pedido</span>
            </h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Busque o cliente ou cadastre na hora · depois escolha os produtos
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {erro && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {erro}
            </div>
          )}

          {passo === "buscar" ? (
            <>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
                  1. Buscar cliente
                </label>
                <CrmRedePicker onSelect={(c) => void selecionarContato(c)} />
              </div>

              {criando && (
                <p className="text-xs text-zinc-500 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Preparando pedido...
                </p>
              )}

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-zinc-950 px-3 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                    ou
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setErro("");
                  setPasso("manual");
                }}
                className="w-full flex items-center justify-center gap-2 text-xs text-zinc-300 border border-zinc-700 rounded-xl py-3 hover:border-[#C9A66B]/50 hover:text-white transition-colors"
              >
                <UserPlus size={14} />
                Cliente novo (cadastrar agora)
              </button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Cadastro rápido
                </p>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                    Nome *
                  </label>
                  <input
                    value={manual.nome}
                    onChange={(e) => setManual((m) => ({ ...m, nome: e.target.value }))}
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                    WhatsApp
                  </label>
                  <input
                    value={manual.telefone}
                    onChange={(e) => setManual((m) => ({ ...m, telefone: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={manual.email}
                    onChange={(e) => setManual((m) => ({ ...m, email: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]"
                    placeholder="opcional"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                    Cidade
                  </label>
                  <input
                    value={manual.cidade}
                    onChange={(e) => setManual((m) => ({ ...m, cidade: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]"
                    placeholder="opcional"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setErro("");
                    setPasso("buscar");
                  }}
                  className="flex-1 border border-zinc-700 text-zinc-400 text-xs font-black uppercase py-2.5 rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={criando}
                  onClick={() => void salvarManual()}
                  className="flex-1 bg-[#C9A66B] text-black text-xs font-black uppercase py-2.5 rounded-xl disabled:opacity-50"
                >
                  {criando ? "Criando..." : "Continuar → produtos"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {leadPedido && (
        <CrmFechamentoPedidoModal
          variant="admin"
          apiBase="/api/admin/crm"
          lead={leadPedido}
          onClose={() => {
            setLeadPedido(null);
            resetForm();
            onFechou?.();
          }}
          onConcluido={() => {
            setLeadPedido(null);
            resetForm();
            onFechou?.();
          }}
        />
      )}
    </>
  );
}
