"use client";

import { Trophy, Target, Users, Zap, Star, ShieldCheck, ShoppingCart, Award } from "lucide-react";

export default function GamificacaoPage() {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      
      {/* HEADER DE AUTORIDADE */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
          Ecossistema <span className="text-[#C9A66B]">PRO</span>
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto font-medium">
          A Gamificação MASC PRO não é um ranking de ego. É uma prova de maturidade profissional e entrega técnica real.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* COLUNA CABELEIREIRO */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap size={100} />
          </div>
          
          <div>
            <span className="text-[#C9A66B] text-[10px] font-black uppercase tracking-[0.3em] border border-[#C9A66B]/30 px-3 py-1 rounded-full">
              Perfil Cabeleireiro
            </span>
            <h2 className="text-2xl font-black text-white italic mt-4 uppercase tracking-tighter">Evolução Individual</h2>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Como ganhar PRO</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <Target className="text-blue-400 mt-1" size={18} />
                <div>
                  <p className="text-sm font-bold text-white">Constância & Técnica</p>
                  <p className="text-xs text-slate-500">Aplicação do método e conclusão de módulos técnicos.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Users className="text-blue-400 mt-1" size={18} />
                <div>
                  <p className="text-sm font-bold text-white">Indicação Qualificada</p>
                  <p className="text-xs text-slate-500">Expansão da rede com profissionais comprometidos.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <ShoppingCart className="text-blue-400 mt-1" size={18} />
                <div>
                  <p className="text-sm font-bold text-white">Compra de Produtos</p>
                  <p className="text-xs text-slate-500">Uso da linha oficial MASC no dia a dia do salão.</p>
                </div>
              </li>
            </ul>

            <div className="bg-blue-400/5 border border-blue-400/10 rounded-2xl p-5">
              <p className="text-[10px] font-black text-blue-400 uppercase mb-2">Recompensa Real</p>
              <p className="text-sm text-slate-300 font-medium">Acesso a novos módulos, visibilidade interna no Rank e convite para subir na hierarquia.</p>
            </div>
          </div>
        </div>

        {/* COLUNA EMBAIXADOR */}
        <div className="bg-[#0A0A0A] border border-[#C9A66B]/20 rounded-3xl p-8 space-y-8 relative overflow-hidden group shadow-[0_0_50px_rgba(201,166,107,0.03)]">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Award size={100} className="text-[#C9A66B]" />
          </div>

          <div>
            <span className="bg-[#C9A66B] text-black text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full">
              Perfil Embaixador
            </span>
            <h2 className="text-2xl font-black text-white italic mt-4 uppercase tracking-tighter">Responsabilidade & Liderança</h2>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Como ganhar PRO</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <Star className="text-[#C9A66B] mt-1" size={18} />
                <div>
                  <p className="text-sm font-bold text-white">Formação de Alunos</p>
                  <p className="text-xs text-slate-500">Responsabilidade direta pelo sucesso e evolução de outros.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <ShieldCheck className="text-[#C9A66B] mt-1" size={18} />
                <div>
                  <p className="text-sm font-bold text-white">Representação de Marca</p>
                  <p className="text-xs text-slate-500">Entrega educacional e presença em eventos oficiais.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Users className="text-[#C9A66B] mt-1" size={18} />
                <div>
                  <p className="text-sm font-bold text-white">Gestão de Rede</p>
                  <p className="text-xs text-slate-500">Alta performance em indicações e retenção de membros.</p>
                </div>
              </li>
            </ul>

            <div className="bg-[#C9A66B]/5 border border-[#C9A66B]/10 rounded-2xl p-5">
              <p className="text-[10px] font-black text-[#C9A66B] uppercase mb-2">Recompensa Real</p>
              <p className="text-sm text-slate-300 font-medium">Hierarquia de autoridade, agenda exclusiva em eventos e prioridade total no ecossistema.</p>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER DE MATURIDADE */}
      <div className="max-w-xl mx-auto text-center p-6 border-t border-white/5">
         <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">
           O PRO é a prova da sua maturidade profissional.
         </p>
      </div>

    </div>
  );
}