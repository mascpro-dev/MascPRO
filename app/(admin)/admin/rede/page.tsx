"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import AdminMemberAvatar from "@/componentes/AdminMemberAvatar";
import { PRO_POR_INDICADO } from "@/lib/networkCoinsIndicacao";

type LiderRede = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  count: number;
  network_coins: number;
  total_compras_rede: number;
  pro_rede_total: number;
  network_coins_esperado: number;
  network_coins_ok: boolean;
  indicados: { id: string; full_name: string; avatar_url: string | null }[];
};

export default function RadarRedePage() {
  const [influencers, setInfluencers] = useState<LiderRede[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const divergentes = influencers.filter((l) => !l.network_coins_ok).length;

  useEffect(() => {
    async function fetchRedeTotal() {
      setLoading(true);
      setErro("");
      const res = await fetch("/api/admin/rede", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErro(data?.error || "Erro ao carregar dados da rede.");
        setInfluencers([]);
        setLoading(false);
        return;
      }
      setInfluencers(data.lideres || []);
      setLoading(false);
    }
    fetchRedeTotal();
  }, []);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-8">
        <h1 className="text-2xl font-black italic uppercase mb-2">
          Radar de <span className="text-[#C9A66B]">Influência</span>
        </h1>
        <p className="text-xs text-zinc-500 mb-6">
          Cada indicado direto = <strong className="text-[#C9A66B]">{PRO_POR_INDICADO} PRO</strong> em{" "}
          <span className="text-zinc-400">network_coins</span> + compras dos indicados em{" "}
          <span className="text-zinc-400">total_compras_rede</span>.
        </p>
        {erro && (
          <div className="mb-4 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 text-xs text-red-300">
            {erro}
          </div>
        )}
        {!loading && divergentes > 0 && (
          <div className="mb-4 rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-xs text-amber-200">
            {divergentes} líder(es) com PRO de indicação divergente. Rode{" "}
            <code className="text-amber-100">supabase/recalcular_network_coins_indicacao.sql</code> no Supabase.
          </div>
        )}
        
        {loading ? (
          <p className="animate-pulse text-zinc-500 font-black">RASTREAMENTO EM CURSO...</p>
        ) : (
          <div className="space-y-4">
            {influencers.length === 0 && <p className="text-zinc-600">Nenhuma indicação detectada no banco de dados.</p>}
            {influencers.map((lider) => (
              <div key={lider.id} className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <AdminMemberAvatar
                      size="lg"
                      avatarUrl={lider.avatar_url}
                      name={lider.full_name}
                      className="rounded-full border-[#C9A66B]/40"
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-black bg-[#C9A66B] px-1 text-[10px] font-black text-black shadow-[0_0_12px_rgba(201,166,107,0.45)]"
                      title="Indicações"
                    >
                      {lider.count}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-black uppercase italic text-lg truncate">{lider.full_name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Líder de Rede</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                      <span
                        className={`px-2 py-0.5 rounded-full border ${
                          lider.network_coins_ok
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        Indicação: {lider.network_coins.toLocaleString("pt-BR")} PRO
                        {!lider.network_coins_ok && ` (esperado ${lider.network_coins_esperado})`}
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300">
                        Compras rede: {lider.total_compras_rede.toLocaleString("pt-BR")} PRO
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-zinc-600 bg-zinc-800/50 text-zinc-300">
                        Total rede: {lider.pro_rede_total.toLocaleString("pt-BR")} PRO
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex -space-x-2 overflow-hidden shrink-0">
                  {lider.indicados.map((ind) => (
                    <div key={ind.id} className="ring-2 ring-black rounded-full" title={ind.full_name}>
                      <AdminMemberAvatar
                        size="xs"
                        avatarUrl={ind.avatar_url}
                        name={ind.full_name}
                        className="rounded-full border-zinc-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
