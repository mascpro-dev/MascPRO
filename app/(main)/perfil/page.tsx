"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { ShieldCheck, LayoutDashboard, User, Camera, Instagram, Phone, MapPin, Save } from "lucide-react";

export default function PerfilPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setProfile(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const isAdmin = profile?.role === 'ADMIN';

  return (
    <div className="p-4 md:p-8 min-h-screen bg-black text-white font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* COLUNA 1: FOTO E DICAS */}
        <div className="space-y-4">
          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 text-center flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full bg-zinc-800 border-2 border-[#C9A66B] overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User size={48} className="text-zinc-600" />}
            </div>
            <button className="flex items-center gap-2 text-[10px] font-black uppercase text-[#C9A66B] tracking-widest hover:brightness-125">
              <Camera size={14} /> Alterar Foto
            </button>
          </div>

          <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-[#C9A66B] w-4 h-4" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dica MASC PRO</p>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Mantenha seu perfil atualizado para que outros profissionais te encontrem e você aumente sua rede.
            </p>
          </div>

          {/* BOTÃO ADMIN - AGORA ABAIXO DA DICA */}
          {isAdmin && (
            <button 
              onClick={() => router.push('/admin')}
              className="w-full flex items-center justify-center gap-3 bg-[#C9A66B] text-black font-black uppercase italic py-4 rounded-2xl hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(201,166,107,0.3)]"
            >
              <LayoutDashboard size={20} />
              Acessar Radar Admin
            </button>
          )}
        </div>

        {/* COLUNA 2: FORMULÁRIO DE EDIÇÃO (RESTURADO) */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black italic uppercase tracking-tighter">Identidade <span className="text-[#C9A66B]">PRO</span></h3>
               <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                 <Save size={14} /> Salvar Alterações
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Nome Completo</label>
                <input type="text" defaultValue={profile?.full_name} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C9A66B] outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Apelido (Username)</label>
                <input type="text" placeholder="@" defaultValue={profile?.username} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C9A66B] outline-none transition-all" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Bio (Sobre você)</label>
                <textarea defaultValue={profile?.bio} rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C9A66B] outline-none transition-all resize-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 flex items-center gap-2"><Instagram size={12}/> Instagram</label>
                <input type="text" defaultValue={profile?.instagram} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C9A66B] outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 flex items-center gap-2"><Phone size={12}/> WhatsApp</label>
                <input type="text" defaultValue={profile?.phone} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C9A66B] outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 flex items-center gap-2"><MapPin size={12}/> Cidade / Estado</label>
                <input type="text" placeholder="Ex: Marília - SP" defaultValue={profile?.location} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C9A66B] outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 flex items-center gap-2">Nome da Barbearia</label>
                <input type="text" defaultValue={profile?.barber_shop} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C9A66B] outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 flex items-center gap-2">Tempo de Profissão</label>
                <select defaultValue={profile?.experience_level} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C9A66B] outline-none text-white">
                  <option value="iniciante">Iniciante (menos de 1 ano)</option>
                  <option value="intermediario">1 a 5 anos</option>
                  <option value="master">Mais de 5 anos</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
