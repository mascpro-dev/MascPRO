"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/componentes/AdminSidebar";
import AdminMemberAvatar from "@/componentes/AdminMemberAvatar";
import { Clock, Loader2, CalendarDays } from "lucide-react";

function ymAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMes(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function boundsMes(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    ini: `${ym}-01T00:00:00.000-03:00`,
    fim: `${ym}-${String(last).padStart(2, "0")}T23:59:59.999-03:00`,
  };
}

export default function AdminInativosPage() {
  const supabase = createClientComponentClient();
  const [periodo, setPeriodo] = useState(ymAtual);
  const [membros, setMembros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("periodo");
    if (q && /^\d{4}-\d{2}$/.test(q) && q !== periodo) {
      setPeriodo(q);
      return;
    }

    async function carregar() {
      setLoading(true);
      const { ini, fim } = boundsMes(periodo);

      const { data: pedidos } = await supabase
        .from("orders")
        .select("profile_id")
        .in("status", ["paid", "separacao", "despachado", "entregue"])
        .gte("created_at", ini)
        .lte("created_at", fim);

      const idsAtivos = new Set((pedidos || []).map((p: { profile_id: string | null }) => p.profile_id).filter(Boolean));

      const { data: todos } = await supabase
        .from("profiles")
        .select("id, full_name, email, whatsapp, role, created_at, avatar_url")
        .eq("role", "CABELEIREIRO")
        .order("full_name");

      const inativos = (todos || []).filter((p: { id: string }) => !idsAtivos.has(p.id));
      setMembros(inativos);
      setLoading(false);
    }
    carregar();
  }, [periodo]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-8">
        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Clock className="text-red-500" size={28} />
            <div>
              <h1 className="text-2xl font-black uppercase italic">Quem está <span className="text-red-500">Parado</span></h1>
              <p className="text-zinc-500 text-xs">Sem compra confirmada em {labelMes(periodo)}</p>
            </div>
          </div>
          <label className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2">
            <CalendarDays size={14} className="text-red-400" />
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="bg-transparent text-xs font-bold uppercase tracking-widest text-white outline-none"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-red-500" size={32} /></div>
        ) : membros.length === 0 ? (
          <p className="text-zinc-500 text-center mt-20">Todos os membros compraram em {labelMes(periodo)}.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500 mb-2">{membros.length} membro(s) sem compra em {labelMes(periodo)}</p>
            {membros.map((m) => (
              <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AdminMemberAvatar
                    avatarUrl={m.avatar_url}
                    name={m.full_name}
                    className="rounded-lg border-red-500/20 bg-red-500/10 text-red-400"
                  />
                  <div>
                    <p className="font-bold text-sm">{m.full_name}</p>
                    <p className="text-xs text-zinc-500">{m.email} · {m.whatsapp}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded">
                  INATIVO
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
