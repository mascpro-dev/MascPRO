"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
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
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black text-white italic tracking-tighter">
            MASC <span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-slate-400 mt-2">Acesse sua conta profissional</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 mt-8">
          <div className="bg-slate-900/50 border border-white/10 rounded-xl p-2 flex items-center gap-3">
            <Mail className="text-slate-500 ml-2" size={20} />
            <input 
              type="email" 
              placeholder="Seu e-mail" 
              className="bg-transparent w-full p-2 text-white outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="bg-slate-900/50 border border-white/10 rounded-xl p-2 flex items-center gap-3">
            <Lock className="text-slate-500 ml-2" size={20} />
            <input 
              type="password" 
              placeholder="Sua senha" 
              className="bg-transparent w-full p-2 text-white outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight size={20} /></>}
          </button>
        </form>
        
        <div className="text-center">
            <Link href="/cadastro" className="text-slate-500 hover:text-white text-sm">
                Não tem conta? <span className="text-[#C9A66B]">Crie agora</span>
            </Link>
        </div>
      </div>
    </div>
  );
}