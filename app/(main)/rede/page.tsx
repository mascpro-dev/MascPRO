"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Copy, CheckCircle, TrendingUp, UserPlus } from "lucide-react";

export default function RedePage() {
  const [indicados, setIndicados] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const { data } = await supabase
          .from("profiles")
          .select("full_name, created_at")
          .eq('invited_by', session.user.id);
        if (data) setIndicados(data);
      }
    }
    getData();
  }, [supabase]);

  const inviteLink = `https://mascpro.app/ref/${userId || ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Minha <span className="text-[#C9A66B]">Rede</span></h1>
        
        <div className="flex items-center gap-2 p-1 rounded-xl border border-white/10 bg-[#0A0A0A]">
          <div className="px-4 py-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Link de Convite</p>
            <a href={inviteLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 font-mono hover:underline">
              {inviteLink}
            </a>
          </div>
          <button onClick={handleCopy} className="bg-[#C9A66B] text-black px-6 py-3 rounded-lg font-black text-xs uppercase hover:opacity-90">
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-2xl flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><UserPlus size={24} /></div>
          <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Indicados</p><p className="text-3xl font-black text-white">{indicados.length}</p></div>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-2xl flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#C9A66B]/10 flex items-center justify-center text-[#C9A66B]"><TrendingUp size={24} /></div>
          <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PROs Gerados</p><p className="text-3xl font-black text-white">{indicados.length * 50} PRO</p></div>
        </div>
      </div>
    </div>
  );
}