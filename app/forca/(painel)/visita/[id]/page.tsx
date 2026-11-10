"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import CrmFechamentoPedidoModal from "@/componentes/CrmFechamentoPedidoModal";
import { PROXIMAS_ACOES } from "@/lib/crmCarteira";

type Lead = {
  id: string;
  nome: string | null;
  empresa: string | null;
  telefone: string | null;
  dono_nome: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  bairro: string | null;
  perfil_comercial: string | null;
  relacionamento: string | null;
  proxima_acao: string | null;
  profile_id: string | null;
};

const RESULTADOS = [
  { value: "positivo", label: "Positivo" },
  { value: "neutro", label: "Neutro" },
  { value: "negativo", label: "Negativo" },
  { value: "reagendar", label: "Reagendar" },
];

export default function VisitaPage() {
  const params = useParams<{ id: string }>();
  const leadId = String(params.id || "");
  const [lead, setLead] = useState<Lead | null>(null);
  const [papel, setPapel] = useState("VENDEDOR");
  const [visitaId, setVisitaId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [resultado, setResultado] = useState("positivo");
  const [notas, setNotas] = useState("");
  const [proxima, setProxima] = useState("nenhuma");
  const [quando, setQuando] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [pedido, setPedido] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void carregar();
  }, [leadId]);

  async function carregar() {
    setLoading(true);
    const res = await fetch(`/api/vendedor/forca/visita?lead=${leadId}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir a visita.");
    else {
      setLead(d.lead);
      setPapel(d.papel || "VENDEDOR");
      setVisitaId(d.visita?.id || null);
      setTelefone(d.lead?.telefone || "");
      setCidade(d.lead?.cidade || "");
      setEstado(d.lead?.estado || "");
      setEndereco(d.lead?.endereco || "");
      setBairro(d.lead?.bairro || "");
    }
    setLoading(false);
  }

  async function checkin() {
    setOcupado(true);
    setErro("");
    let lat: number | null = null;
    let lng: number | null = null;
    if (!manual) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        setErro("Não foi possível ler a localização. Use o check-in manual.");
        setOcupado(false);
        return;
      }
    }
    const res = await fetch("/api/vendedor/forca/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "checkin",
        crm_lead_id: leadId,
        manual,
        justificativa,
        lat,
        lng,
      }),
    });
    const d = await res.json().catch(() => null);
    setOcupado(false);
    if (!res.ok || !d?.ok) setErro(d?.error || "Falha no check-in.");
    else setVisitaId(d.visita_id);
  }

  async function encerrar() {
    if (!visitaId) return;
    setOcupado(true);
    setErro("");
    const res = await fetch("/api/vendedor/forca/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "encerrar",
        visita_id: visitaId,
        resultado,
        notas,
        proxima_acao: proxima,
        proxima_acao_em: quando || null,
        telefone,
        cidade,
        estado,
        endereco,
        bairro,
      }),
    });
    const d = await res.json().catch(() => null);
    setOcupado(false);
    if (!res.ok || !d?.ok) setErro(d?.error || "Falha ao encerrar.");
    else window.location.href = "/forca";
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A66B]" />
      </div>
    );
  }

  if (!lead) return <p className="text-sm text-red-400">{erro || "Salão não encontrado."}</p>;

  const nome = lead.empresa || lead.nome || "Salão";
  const zap = String(lead.telefone || "").replace(/\D/g, "");

  return (
    <div className="space-y-4">
      <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
      <header>
        <p className="font-bold">{nome}</p>
        <p className="text-sm text-zinc-400">
          {[lead.dono_nome, lead.cidade, lead.estado].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm text-zinc-500">{[lead.endereco, lead.bairro].filter(Boolean).join(", ")}</p>
      </header>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {zap && (
        <a
          href={`https://wa.me/55${zap.replace(/^55/, "")}`}
          className="inline-block text-xs font-black uppercase tracking-widest text-[#C9A66B]"
        >
          WhatsApp
        </a>
      )}

      {!visitaId ? (
        <section className="space-y-3 rounded-2xl border border-white/10 p-4">
          <p className="text-sm font-bold">Check-in</p>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
            Sem localização, com justificativa
          </label>
          {manual && (
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Por que o check-in é manual?"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
            />
          )}
          <button
            type="button"
            onClick={() => void checkin()}
            disabled={ocupado}
            className="w-full rounded-xl bg-[#C9A66B] py-3 text-sm font-black text-black disabled:opacity-40"
          >
            {ocupado ? "Registrando..." : "Iniciar visita"}
          </button>
        </section>
      ) : (
        <section className="space-y-3 rounded-2xl border border-white/10 p-4">
          <p className="text-sm text-emerald-400">Visita em andamento. Dá para salvar sem pedido.</p>
          <Campo rotulo="Telefone" value={telefone} onChange={setTelefone} />
          <Campo rotulo="Cidade" value={cidade} onChange={setCidade} />
          <Campo rotulo="UF" value={estado} onChange={setEstado} />
          <Campo rotulo="Rua" value={endereco} onChange={setEndereco} />
          <Campo rotulo="Bairro" value={bairro} onChange={setBairro} />
          <button
            type="button"
            onClick={() => setPedido(true)}
            className="w-full rounded-xl border border-[#C9A66B] py-3 text-sm font-black text-[#C9A66B]"
          >
            Pedido
          </button>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Como foi a visita</p>
          <select value={resultado} onChange={(e) => setResultado(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm">
            {RESULTADOS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <select value={proxima} onChange={(e) => setProxima(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm">
            {PROXIMAS_ACOES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <input type="date" value={quando} onChange={(e) => setQuando(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm" />
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observações"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
          />
          <button
            type="button"
            onClick={() => void encerrar()}
            disabled={ocupado}
            className="w-full rounded-xl bg-white py-3 text-sm font-black text-black disabled:opacity-40"
          >
            Salvar visita
          </button>
        </section>
      )}

      {pedido && (
        <CrmFechamentoPedidoModal
          lead={{
            id: lead.id,
            nome: nome,
            email: lead.email,
            telefone: telefone || lead.telefone,
            cidade: cidade || lead.cidade,
            estado: estado || lead.estado,
            profile_id: lead.profile_id,
          }}
          variant={papel === "VENDEDOR" ? "vendedor" : "admin"}
          onClose={() => setPedido(false)}
          onConcluido={() => setPedido(false)}
        />
      )}
    </div>
  );
}

function Campo({ rotulo, value, onChange }: { rotulo: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{rotulo}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
      />
    </label>
  );
}
