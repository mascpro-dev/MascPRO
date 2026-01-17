"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, ArrowRight, Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Erro ao entrar: " + error.message);
      setLoading(false);
    } else {
      router.push("/home");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
        
        {/* Cabeçalho */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-white italic tracking-tighter">
            MASC <span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-slate-400 mt-2">Acesse sua conta profissional</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4 mt-8">
          <div className="bg-slate-900/50 border border-white/10 rounded-xl p-2 flex items-center gap-3 focus-within:border-[#C9A66B] transition-colors">
            <Mail className="text-slate-500 ml-2" size={20} />
            <input 
              type="email" 
              placeholder="Seu e-mail" 
              className="bg-transparent w-full p-2 text-white outline-none placeholder:text-slate-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="bg-slate-900/50 border border-white/10 rounded-xl p-2 flex items-center gap-3 focus-within:border-[#C9A66B] transition-colors">
            <Lock className="text-slate-500 ml-2" size={20} />
            <input 
              type="password" 
              placeholder="Sua senha" 
              className="bg-transparent w-full p-2 text-white outline-none placeholder:text-slate-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* BOTÃO ENTRAR (Estilo Clean/Outline Dourado) */}
          <button 
            disabled={loading}
            className="w-full bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/50 text-[#C9A66B] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(201,166,107,0.1)] hover:shadow-[0_0_30px_rgba(201,166,107,0.2)]"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight size={20} /></>}
          </button>
        </form>
        
        {/* Divisória */}
        <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-black px-2 text-slate-500">Ou</span></div>
        </div>

        {/* Botão do WhatsApp (Estilo Clean/Outline Verde) */}
        <a 
            href="https://wa.me/5511999999999?text=Olá,%20gostaria%20de%20um%20convite%20para%20o%20MASC%20PRO" 
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
            <MessageCircle size={20} />
            Pedir Convite no WhatsApp
        </a>

        {/* Link de Cadastro */}
        <div className="text-center pt-4">
            <Link href="/cadastro" className="text-slate-500 hover:text-white text-sm transition-colors">
                Já tem o código? <span className="text-[#C9A66B] font-bold">Crie sua conta</span>
            </Link>
        </div>

      </div>
    </div>
  );
}