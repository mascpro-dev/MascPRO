export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { User, MapPin, Briefcase, Star, Clock, Home, Camera, Edit3 } from "lucide-react";

export default async function PerfilPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  // Busca o perfil com as novas colunas
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session?.user?.id)
    .single();

  const balance = profile?.pro_balance ?? 0;
  const fullName = profile?.full_name || "Membro MASC";
  
  // Dados novos (com padrão caso esteja vazio)
  const nivel = profile?.nivel || "Embaixadora";
  const profissao = profile?.profissao || "Cabeleireira";
  const local = profile?.cidade || "Não informado";
  const tempo = profile?.tempo_profissao || "Iniciante";
  const trabalho = profile?.tipo_trabalho || "Autônoma";

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter">
            MEU <span className="text-[#C9A66B]">PERFIL</span>
            </h1>
            <p className="text-slate-400 mt-2">Gerencie seus dados e status profissional.</p>
        </div>
        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all">
            <Edit3 size={16} /> Editar Dados
        </button>
      </div>

      {/* CARTÃO PRINCIPAL (FOTO E NOME) */}
      <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <Star size={200} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            
            {/* ÁREA DA FOTO (Com medidas) */}
            <div className="relative group cursor-pointer">
                <div className="w-40 h-40 rounded-full bg-black border-4 border-[#C9A66B] p-1 shadow-[0_0_40px_rgba(201,166,107,0.3)]">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Foto" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-slate-800 flex flex-col items-center justify-center text-slate-500 gap-1">
                            <User size={40} />
                        </div>
                    )}
                </div>
                {/* Botão de Trocar Foto (Aparece ao passar o mouse ou fixo) */}
                <div className="absolute bottom-2 right-2 bg-[#C9A66B] text-black p-2 rounded-full border-2 border-black shadow-lg hover:scale-110 transition-transform">
                    <Camera size={18} />
                </div>
                
                {/* Dica de Medidas */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 text-center">
                    <p className="text-[10px] text-slate-500 font-mono bg-black/80 px-2 py-1 rounded border border-white/10">
                        Medida ideal: 400x400px
                    </p>
                </div>
            </div>

            {/* Texto */}
            <div className="text-center md:text-left space-y-2 flex-1">
                <div className="inline-flex items-center gap-2 bg-[#C9A66B]/20 border border-[#C9A66B]/30 px-3 py-1 rounded-full mb-2">
                    <Star size={12} className="text-[#C9A66B] fill-current" />
                    <span className="text-xs font-bold text-[#C9A66B] uppercase tracking-wide">{nivel}</span>
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight">{fullName}</h2>
                <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2">
                    <Briefcase size={16} /> {profissao}
                </p>
                <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-4">
                     <div className="text-center md:text-left">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Saldo Atual</p>
                        <p className="text-2xl font-black text-white">{balance} PRO</p>
                     </div>
                </div>
            </div>
        </div>
      </div>

      {/* GRID DE INFORMAÇÕES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Coluna 1: Profissional */}
          <div className="space-y-6">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Briefcase className="text-[#C9A66B]" size={20} /> Detalhes Profissionais
              </h3>
              <div className="bg-black border border-white/10 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <span className="text-slate-500 text-sm">Tempo de Profissão</span>
                      <span className="text-white font-bold flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" /> {tempo}
                      </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <span className="text-slate-500 text-sm">Modelo de Trabalho</span>
                      <span className="text-white font-bold flex items-center gap-2">
                          <Home size={14} className="text-slate-400" /> {trabalho}
                      </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-500 text-sm">Nível Atual</span>
                      <span className="text-[#C9A66B] font-bold">{nivel}</span>
                  </div>
              </div>
          </div>

          {/* Coluna 2: Endereço */}
          <div className="space-y-6">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <MapPin className="text-[#C9A66B]" size={20} /> Localização
              </h3>
              <div className="bg-black border border-white/10 rounded-2xl p-6 space-y-4">
                   {/* Aqui mostramos os dados que criamos no SQL */}
                   <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Endereço Principal</p>
                        <p className="text-white font-bold text-lg">{profile?.rua || "Endereço não cadastrado"}</p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 pt-2">
                       <div>
                           <p className="text-xs text-slate-500 uppercase tracking-widest">Bairro</p>
                           <p className="text-slate-300">{profile?.bairro || "-"}</p>
                       </div>
                       <div>
                           <p className="text-xs text-slate-500 uppercase tracking-widest">Cidade</p>
                           <p className="text-slate-300">{local}</p>
                       </div>
                   </div>

                   <div className="pt-2 border-t border-white/5 mt-2">
                       <p className="text-xs text-slate-500 uppercase tracking-widest">CEP</p>
                       <p className="text-slate-300 font-mono">{profile?.cep || "-"}</p>
                   </div>
              </div>
          </div>
      </div>

    </div>
  );
}