"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/componentes/AdminSidebar";
import { Zap, Loader2 } from "lucide-react";

export default function AdminAtivosPage() {
  const supabase = createClientComponentClient();
  const [membros, setMembros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();

      // Busca profiles que têm pedido pago este mês
      const { data: pedidos } = await supabase
        .from("orders")
        .select("profile_id")
        .in("status", ["paid", "separacao", "despachado", "entregue"])
        .gte("created_at", inicioMes);

      const idsAtivos = [...new Set((pedidos || []).map((p: any) => p.profile_id).filter(Boolean))];

      if (idsAtivos.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, whatsapp, role, created_at")
          .in("id", idsAtivos)
          .order("full_name");
        setMembros(profiles || []);
      }
      setLoading(false);
    }
    carregar();
  }, []);

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center gap-3 mb-8">
          <Zap className="text-yellow-500" size={28} />
          <div>
            <h1 className="text-2xl font-black uppercase italic">Quem está <span className="text-yellow-500">Ativo</span></h1>
            <p className="text-zinc-500 text-xs">Membros com compra confirmada no mês atual</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-yellow-500" size={32} /></div>
        ) : membros.length === 0 ? (
          <p className="text-zinc-500 text-center mt-20">Nenhum membro ativo este mês ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500 mb-2">{membros.length} membro(s) ativo(s) este mês</p>
            {membros.map((m) => (
              <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center font-black text-yellow-400">
                    {m.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{m.full_name}</p>
                    <p className="text-xs text-zinc-500">{m.email} · {m.whatsapp}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded">
                  ATIVO
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
