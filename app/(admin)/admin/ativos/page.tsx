"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import AdminMemberAvatar from "@/componentes/AdminMemberAvatar";
import { Zap, Loader2, CalendarDays } from "lucide-react";
import { getProBreakdown } from "@/lib/proScore";

function ymAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMes(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function AdminAtivosPage() {
  const [periodo, setPeriodo] = useState(ymAtual);
  const [membros, setMembros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("periodo");
    if (q && /^\d{4}-\d{2}$/.test(q) && q !== periodo) {
      setPeriodo(q);
      return;
    }
    setLoading(true);
    setErro("");
    fetch(`/api/admin/ativos?periodo=${periodo}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setMembros(d.membros || []);
        else setErro(d.error || "Erro ao carregar.");
      })
      .catch(() => setErro("Falha de rede."))
      .finally(() => setLoading(false));
  }, [periodo]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-8">
        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Zap className="text-yellow-500" size={28} />
            <div>
              <h1 className="text-2xl font-black uppercase italic">
                Quem está <span className="text-yellow-500">Ativo</span>
              </h1>
              <p className="text-zinc-500 text-xs">
                Compra paga em {labelMes(periodo)} · entra na lista no momento do pagamento
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2">
            <CalendarDays size={14} className="text-yellow-500" />
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="bg-transparent text-xs font-bold uppercase tracking-widest text-white outline-none"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20">
            <Loader2 className="animate-spin text-yellow-500" size={32} />
          </div>
        ) : erro ? (
          <p className="text-red-400 text-sm text-center mt-20">{erro}</p>
        ) : membros.length === 0 ? (
          <p className="text-zinc-500 text-center mt-20">Nenhum membro com compra paga em {labelMes(periodo)}.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500 mb-2 font-bold">
              {membros.length} membro(s) com compra paga em {labelMes(periodo)}
            </p>
            {membros.map((m) => (
              <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AdminMemberAvatar
                    avatarUrl={m.avatar_url}
                    name={m.full_name}
                    className="rounded-lg border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                  />
                  <div>
                    <p className="font-bold text-sm">{m.full_name}</p>
                    <p className="text-xs text-zinc-500">{m.email}{m.whatsapp ? ` · ${m.whatsapp}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getProBreakdown(m).total > 0 && (
                    <span className="text-[10px] text-[#C9A66B] font-bold">{getProBreakdown(m).total} PRO</span>
                  )}
                  <span className="text-[10px] font-black uppercase text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded">
                    ATIVO
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
