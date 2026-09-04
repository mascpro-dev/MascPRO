"use client";

import { useState } from "react";
import { Loader2, Plus, ShoppingBag, X, AlertCircle } from "lucide-react";
import CrmFechamentoPedidoModal from "@/componentes/CrmFechamentoPedidoModal";
import VendedorRedePicker, {
  type ContatoRedeVendedor,
} from "@/componentes/VendedorRedePicker";

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
  /** Botão compacto (ex.: header) ou destaque */
  variante?: "destaque" | "header";
};

export default function VendedorNovoPedidoButton({
  onFechou,
  variante = "destaque",
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<"escolher" | "manual">("escolher");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");
  const [leadPedido, setLeadPedido] = useState<LeadPedido | null>(null);
  const [manual, setManual] = useState({ nome: "", telefone: "", email: "", cidade: "" });

  function fecharTudo() {
    setAberto(false);
    setPasso("escolher");
    setErro("");
    setLeadPedido(null);
    setManual({ nome: "", telefone: "", email: "", cidade: "" });
  }

  async function criarLeadEAbrirPedido(dados: {
    nome: string;
    telefone?: string | null;
    email?: string | null;
    cidade?: string | null;
    estado?: string | null;
    profile_id?: string | null;
    crm_lead_id?: string | null;
  }) {
    setCriando(true);
    setErro("");
    try {
      let leadId = dados.crm_lead_id || null;

      if (!leadId) {
        const res = await fetch("/api/vendedor/crm/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: dados.nome,
            telefone: dados.telefone || null,
            email: dados.email || null,
            cidade: dados.cidade || null,
            estado: dados.estado || null,
            origem: "indicacao",
            perfil: "cabeleireiro",
            profile_id: dados.profile_id || null,
          }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok || !d?.ok) {
          setErro(d?.error || "Não foi possível criar o lead do pedido.");
          return;
        }
        leadId = d.lead.id;
        // Vincula profile se veio da rede e a API não gravou
        if (dados.profile_id && !d.lead.profile_id) {
          await fetch(`/api/vendedor/crm/leads/${d.lead.id}`, {
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
      setAberto(false);
    } finally {
      setCriando(false);
    }
  }

  async function selecionarRede(c: ContatoRedeVendedor) {
    await criarLeadEAbrirPedido({
      nome: c.nome,
      telefone: c.telefone,
      email: c.email,
      cidade: c.cidade,
      estado: c.estado,
      profile_id: c.profile_id,
      crm_lead_id: c.crm_lead_id,
    });
  }

  async function salvarManual() {
    if (!manual.nome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    await criarLeadEAbrirPedido({
      nome: manual.nome.trim(),
      telefone: manual.telefone.trim() || null,
      email: manual.email.trim() || null,
      cidade: manual.cidade.trim() || null,
    });
  }

  const btnClass =
    variante === "header"
      ? "inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#C9A66B]/40 bg-[#C9A66B]/15 text-[#C9A66B] text-xs font-black uppercase tracking-widest hover:bg-[#C9A66B]/25"
      : "inline-flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black uppercase text-xs tracking-widest px-6 py-3 rounded-xl";

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={btnClass}>
        <Plus size={16} />
        Novo pedido
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div>
                <h2 className="font-black uppercase text-sm tracking-widest text-[#C9A66B] flex items-center gap-2">
                  <ShoppingBag size={16} /> Novo pedido
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Escolha da rede ou cadastre na hora</p>
              </div>
              <button type="button" onClick={fecharTudo} aria-label="Fechar">
                <X size={20} className="text-zinc-500 hover:text-white" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {erro && (
                <div className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm bg-red-500/10 border border-red-500/30 text-red-400">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {erro}
                </div>
              )}

              {passo === "escolher" ? (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                      Cliente da minha rede
                    </label>
                    <VendedorRedePicker onSelect={(c) => void selecionarRede(c)} />
                  </div>
                  {criando && (
                    <p className="text-xs text-zinc-500 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Preparando pedido...
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setPasso("manual")}
                    className="w-full text-xs text-zinc-400 border border-zinc-700 rounded-xl py-2.5 hover:border-zinc-500 hover:text-white"
                  >
                    Cliente novo (não está na rede)
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Nome *</label>
                      <input
                        value={manual.nome}
                        onChange={(e) => setManual((m) => ({ ...m, nome: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">WhatsApp</label>
                      <input
                        value={manual.telefone}
                        onChange={(e) => setManual((m) => ({ ...m, telefone: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">E-mail</label>
                      <input
                        value={manual.email}
                        onChange={(e) => setManual((m) => ({ ...m, email: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Cidade</label>
                      <input
                        value={manual.cidade}
                        onChange={(e) => setManual((m) => ({ ...m, cidade: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPasso("escolher")}
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
                      {criando ? "Criando..." : "Continuar pedido"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {leadPedido && (
        <CrmFechamentoPedidoModal
          variant="vendedor"
          apiBase="/api/vendedor/crm"
          lead={leadPedido}
          onClose={() => {
            setLeadPedido(null);
            onFechou?.();
          }}
          onConcluido={() => {
            setLeadPedido(null);
            onFechou?.();
          }}
        />
      )}
    </>
  );
}
