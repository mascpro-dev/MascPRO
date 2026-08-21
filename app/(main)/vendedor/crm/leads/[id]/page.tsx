"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ErroComVoltar from "@/componentes/ErroComVoltar";
import CrmFechamentoPedidoModal from "@/componentes/CrmFechamentoPedidoModal";
import PedidoPdfClienteButton from "@/componentes/PedidoPdfClienteButton";
import {
  ArrowLeft, Loader2, Pencil, Save, X,
  MessageCircle, Mail, Calendar, FileText, PhoneCall, Clock, Tag, ShoppingBag,
} from "lucide-react";

type Atividade = {
  id: string;
  created_at: string;
  tipo: string;
  conteudo: string;
  autor: { full_name: string } | null;
};

type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  status: string;
  data_followup: string | null;
  notas: string | null;
  profile_id: string | null;
  order_id: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo", contato_feito: "Contato", proposta: "Proposta",
  negociacao: "Negociação", fechado: "Fechado", perdido: "Perdido",
};

export default function VendedorLeadDetalhePage() {
  const params = useParams();
  const id = params.id as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [modalPedido, setModalPedido] = useState(false);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/vendedor/crm/leads/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErro(data?.error || "Lead não encontrado.");
      setLoading(false);
      return;
    }
    setLead(data.lead);
    setAtividades(data.atividades || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function salvar() {
    const res = await fetch(`/api/vendedor/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      setLead(d.lead);
      setEditando(false);
      void carregar();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A66B]" size={28} />
      </div>
    );
  }

  if (erro || !lead) {
    return <ErroComVoltar mensagem={erro} onVoltar={() => window.history.back()} rotuloVoltar="Pipeline" />;
  }

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]";

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      <Link href="/vendedor/crm" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-[#C9A66B] text-xs font-bold uppercase tracking-widest">
        <ArrowLeft size={14} /> Pipeline
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]/80 mb-1">
            {STATUS_LABEL[lead.status] || lead.status}
          </p>
          <h1 className="text-2xl font-black text-white">{lead.nome}</h1>
          {lead.order_id && (
            <div className="mt-2">
              <PedidoPdfClienteButton orderId={lead.order_id} label="PDF do pedido" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setForm({ nome: lead.nome, telefone: lead.telefone || "", email: lead.email || "" }); setEditando(true); }} className="px-4 py-2 rounded-xl border border-zinc-700 text-xs font-black uppercase text-zinc-400">
            <Pencil size={14} className="inline mr-1" /> Editar
          </button>
          <button type="button" onClick={() => setModalPedido(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#C9A66B] text-xs font-black uppercase">
            <ShoppingBag size={14} /> Fechar pedido
          </button>
        </div>
      </div>

      {editando && (
        <div className="space-y-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          {(["nome", "telefone", "email"] as const).map((k) => (
            <input key={k} value={form[k] || ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className={inputClass} placeholder={k} />
          ))}
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditando(false)} className="px-4 py-2 border border-zinc-700 rounded-xl"><X size={14} /></button>
            <button type="button" onClick={salvar} className="px-4 py-2 bg-[#C9A66B] text-black rounded-xl text-xs font-black uppercase"><Save size={14} className="inline" /> Salvar</button>
          </div>
        </div>
      )}

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-2">
        {lead.telefone && (
          <a href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`} className="flex items-center gap-2 text-green-400 text-sm">
            <MessageCircle size={14} /> {lead.telefone}
          </a>
        )}
        {lead.email && <p className="text-sm text-zinc-300"><Mail size={14} className="inline mr-1" />{lead.email}</p>}
        {lead.data_followup && (
          <p className="text-sm text-zinc-400"><Calendar size={14} className="inline mr-1" />Follow-up: {new Date(lead.data_followup + "T12:00:00").toLocaleDateString("pt-BR")}</p>
        )}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-xs font-black uppercase text-zinc-500 mb-3">Histórico</h2>
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {atividades.map((a) => (
            <li key={a.id} className="text-sm border-b border-zinc-800/50 pb-2">
              <p className="text-zinc-300">{a.conteudo}</p>
              <p className="text-[10px] text-zinc-600">{new Date(a.created_at).toLocaleString("pt-BR")}</p>
            </li>
          ))}
        </ul>
      </div>

      {modalPedido && (
        <CrmFechamentoPedidoModal
          variant="vendedor"
          apiBase="/api/vendedor/crm"
          lead={{ id: lead.id, nome: lead.nome, email: lead.email, telefone: lead.telefone, cidade: lead.cidade, estado: lead.estado, profile_id: lead.profile_id }}
          onClose={() => setModalPedido(false)}
          onConcluido={() => { setModalPedido(false); void carregar(); }}
        />
      )}
    </div>
  );
}
