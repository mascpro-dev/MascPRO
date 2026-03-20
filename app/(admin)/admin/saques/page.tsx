"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import { ArrowDownToLine, CheckCircle, XCircle, Clock, Loader2, RefreshCw } from "lucide-react";

type Saque = {
  id: string;
  embaixador_id: string;
  valor_bruto: number;
  taxa_percentual: number;
  valor_taxa: number;
  valor_liquido: number;
  chave_pix: string;
  status: string;
  created_at: string;
  processado_em: string | null;
  profiles: { full_name: string; nivel: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  aguardando: "bg-yellow-900/20 text-yellow-400 border-yellow-800/40",
  aprovado:   "bg-green-900/20  text-green-400  border-green-800/40",
  rejeitado:  "bg-red-900/20    text-red-400    border-red-800/40",
};

export default function AdminSaquesPage() {
  const [saques, setSaques] = useState<Saque[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "aguardando" | "aprovado" | "rejeitado">("aguardando");
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => { carregarSaques(); }, [filtro]);

  async function carregarSaques() {
    setLoading(true);
    setErro("");
    const res = await fetch(`/api/admin/saques?status=${filtro}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErro(data?.error || "Erro ao carregar saques.");
      setSaques([]);
      setLoading(false);
      return;
    }
    setSaques((data.saques as any) || []);
    setLoading(false);
  }

  async function atualizarStatus(id: string, novoStatus: "aprovado" | "rejeitado") {
    setProcessando(id);
    const res = await fetch("/api/admin/saques/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, novoStatus }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErro(data?.error || "Erro ao atualizar saque.");
    }
    await carregarSaques();
    setProcessando(null);
  }

  const totalPendente = saques
    .filter(s => s.status === "aguardando")
    .reduce((acc, s) => acc + Number(s.valor_liquido), 0);

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-8">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black italic uppercase">
              Saques <span className="text-[#C9A66B]">& Comissões</span>
            </h1>
            <p className="text-zinc-500 text-xs mt-1">
              Total em fila de pagamento:{" "}
              <span className="text-green-400 font-bold">R$ {totalPendente.toFixed(2)}</span>
            </p>
          </div>
          <button onClick={carregarSaques} className="text-zinc-500 hover:text-white transition-colors">
            <RefreshCw size={20} />
          </button>
        </div>
        {erro && (
          <div className="mb-4 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 text-xs text-red-300">
            {erro}
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["todos", "aguardando", "aprovado", "rejeitado"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                filtro === f
                  ? "bg-[#C9A66B] text-black border-[#C9A66B]"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
          </div>
        ) : saques.length === 0 ? (
          <div className="text-center py-20 text-zinc-600">
            <ArrowDownToLine size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold uppercase tracking-widest text-sm">Nenhum saque encontrado</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {saques.map(saque => (
              <div
                key={saque.id}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Info do embaixador */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-[#C9A66B]/20 text-[#C9A66B] flex items-center justify-center font-black text-lg shrink-0">
                    {saque.profiles?.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-bold text-white">{saque.profiles?.full_name || "—"}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                      {saque.profiles?.nivel || "embaixador"} · {new Date(saque.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      PIX: <span className="text-white font-mono">{saque.chave_pix}</span>
                    </p>
                  </div>
                </div>

                {/* Valores */}
                <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
                  <p className="text-2xl font-black text-green-400">R$ {Number(saque.valor_liquido).toFixed(2)}</p>
                  <p className="text-[10px] text-zinc-500">
                    Bruto: R$ {Number(saque.valor_bruto).toFixed(2)} · Taxa {saque.taxa_percentual}%: R$ {Number(saque.valor_taxa).toFixed(2)}
                  </p>
                  <span className={`text-[10px] font-black uppercase tracking-widest border px-3 py-1 rounded-full ${STATUS_STYLE[saque.status] || ""}`}>
                    {saque.status === "aguardando" && <Clock size={10} className="inline mr-1" />}
                    {saque.status === "aprovado"   && <CheckCircle size={10} className="inline mr-1" />}
                    {saque.status === "rejeitado"  && <XCircle size={10} className="inline mr-1" />}
                    {saque.status}
                  </span>
                </div>

                {/* Ações */}
                {saque.status === "aguardando" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => atualizarStatus(saque.id, "aprovado")}
                      disabled={processando === saque.id}
                      className="bg-green-700 hover:bg-green-600 text-white font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl flex items-center gap-1 disabled:opacity-50"
                    >
                      {processando === saque.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      APROVAR
                    </button>
                    <button
                      onClick={() => atualizarStatus(saque.id, "rejeitado")}
                      disabled={processando === saque.id}
                      className="bg-red-900/40 hover:bg-red-800/60 text-red-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl flex items-center gap-1 disabled:opacity-50"
                    >
                      <XCircle size={14} /> REJEITAR
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
