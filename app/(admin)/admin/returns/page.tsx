"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import {
  RotateCcw,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  PackageCheck,
  Clock3,
} from "lucide-react";

type ReturnRow = {
  id: string;
  created_at: string;
  status: "solicitado" | "aprovado" | "rejeitado" | "concluido";
  tipo: string;
  motivo: string;
  observacao: string | null;
  valor_estorno: number | null;
  profiles?: { full_name?: string; email?: string } | null;
  orders?: { id?: string; total?: number; status?: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  solicitado: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  aprovado: "bg-blue-500/10 border-blue-500/30 text-blue-300",
  rejeitado: "bg-red-500/10 border-red-500/30 text-red-400",
  concluido: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
};

function moeda(v?: number | null) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ReturnsPage() {
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("solicitado");
  const [role, setRole] = useState("");
  const [processando, setProcessando] = useState<string | null>(null);

  const isAdmin = role === "ADMIN";

  async function carregar() {
    setLoading(true);
    const qs = filtro !== "todos" ? `?status=${filtro}` : "?status=todos";
    const res = await fetch(`/api/admin/returns${qs}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (d?.ok) {
      setRows(d.returns || []);
      setRole(String(d.role || "").toUpperCase());
    } else {
      setRows([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, [filtro]);

  async function atualizarStatus(id: string, status: "aprovado" | "rejeitado" | "concluido") {
    setProcessando(id);
    const res = await fetch("/api/admin/returns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) {
      alert(d?.error || "Erro ao atualizar devolução.");
    } else {
      await carregar();
    }
    setProcessando(null);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <RotateCcw className="text-[#C9A66B]" size={26} />
            <div>
              <h1 className="text-2xl font-black italic uppercase">
                Devoluções <span className="text-[#C9A66B]">& Trocas</span>
              </h1>
              <p className="text-zinc-500 text-xs">
                Acompanhe solicitações, aprovações e conclusão de estornos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {["solicitado", "aprovado", "rejeitado", "concluido", "todos"].map((s) => (
              <button
                key={s}
                onClick={() => setFiltro(s)}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${
                  filtro === s
                    ? "bg-[#C9A66B] text-black border-[#C9A66B]"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {s}
              </button>
            ))}
            <button
              onClick={carregar}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20">
            <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center mt-20">
            <RotateCcw size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Nenhuma devolução encontrada para este filtro.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((r) => {
              const statusClass = STATUS_BADGE[r.status] || "bg-zinc-500/10 border-zinc-500/30 text-zinc-300";
              return (
                <div key={r.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl border ${statusClass}`}>
                          <Clock3 size={11} /> {r.status}
                        </span>
                        <span className="text-zinc-500 text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                      </div>

                      <p className="text-white font-bold mt-3">{r.motivo}</p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Tipo: <span className="text-zinc-300">{r.tipo || "devolucao"}</span>
                        {" · "}
                        Estorno: <span className="text-zinc-200 font-bold">{moeda(r.valor_estorno)}</span>
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Cliente: {r.profiles?.full_name || "—"} {r.profiles?.email ? `(${r.profiles.email})` : ""}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Pedido: {r.orders?.id || "—"} · Total: {moeda(r.orders?.total)}
                      </p>
                      {r.observacao && <p className="text-[11px] text-zinc-400 mt-2">Obs: {r.observacao}</p>}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {r.status !== "aprovado" && r.status !== "concluido" && (
                          <button
                            onClick={() => atualizarStatus(r.id, "aprovado")}
                            disabled={processando === r.id}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-blue-900/20 border border-blue-700/30 text-blue-300 hover:bg-blue-900/40 transition-all disabled:opacity-50"
                          >
                            {processando === r.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            Aprovar
                          </button>
                        )}

                        {r.status !== "rejeitado" && r.status !== "concluido" && (
                          <button
                            onClick={() => atualizarStatus(r.id, "rejeitado")}
                            disabled={processando === r.id}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 hover:bg-red-900/40 transition-all disabled:opacity-50"
                          >
                            {processando === r.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                            Rejeitar
                          </button>
                        )}

                        {r.status !== "concluido" && r.status !== "rejeitado" && (
                          <button
                            onClick={() => atualizarStatus(r.id, "concluido")}
                            disabled={processando === r.id}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-emerald-900/20 border border-emerald-700/30 text-emerald-300 hover:bg-emerald-900/40 transition-all disabled:opacity-50"
                          >
                            {processando === r.id ? <Loader2 size={12} className="animate-spin" /> : <PackageCheck size={12} />}
                            Concluir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

