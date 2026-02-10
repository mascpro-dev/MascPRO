"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardPage() {
  const supabase = createClientComponentClient();

  // COLOQUE AQUI:
  const formatNumber = (n: any) => {
    if (n === undefined || n === null) return "0";
    return Number(n).toLocaleString('pt-BR');
  };

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('moedas_pro_acumuladas, meritocracia_total, residual_rede_total')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      }
    }
    loadData();
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* CARD TOTAL: 4.620 PRO */}
      <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-[#C9A66B]/20">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1">RUMO AO CERTIFIED</p>
        <h2 className="text-5xl font-black italic text-white tracking-tighter mb-4">
          {formatNumber(profile?.moedas_pro_acumuladas)} <span className="text-sm text-[#C9A66B] font-black italic uppercase">PRO</span>
        </h2>
        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#C9A66B] h-full" style={{ width: `${Math.min(((profile?.moedas_pro_acumuladas || 0) / 10000) * 100, 100)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* TÉCNICA: 3.920 PRO */}
        <div className="bg-zinc-900/30 p-5 rounded-[1.5rem] border border-white/5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Evolução Técnica</p>
          <p className="text-3xl font-black text-white italic tracking-tighter">
            {formatNumber(profile?.meritocracia_total)} <span className="text-[10px] text-zinc-700 font-bold italic">PRO</span>
          </p>
        </div>

        {/* REDE: 700 PRO */}
        <div className="bg-zinc-900/30 p-5 rounded-[1.5rem] border border-white/5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Potencial da REDE</p>
          <p className="text-3xl font-black text-green-500 italic tracking-tighter">
            {formatNumber(profile?.residual_rede_total)} <span className="text-[10px] text-green-900 font-bold italic">PRO</span>
          </p>
        </div>
      </div>
    </div>
  );
}
