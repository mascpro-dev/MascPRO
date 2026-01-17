"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react"; // Adicionado Suspense
import Link from "next/link";
import { Loader2, User, Mail, Lock, ArrowRight } from "lucide-react";

// 1. COMPONENTE DO FORMULÁRIO (É ele que usa o useSearchParams)
function CadastroForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams(); // Aqui está o motivo do erro anterior
  const supabase = createClientComponentClient();

  // Captura o código
  const referralCode = searchParams.get("ref");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      alert("Erro: " + authError.message);
      setLoading(false);
      return;
    }

    if (referralCode && authData.user) {
      await supabase
        .from("profiles")
        .update({ referred_by: referralCode })
        .eq("id", authData.user.id);
    }

    alert("Cadastro realizado! Verifique seu email.");
    router.push("/login");
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Criar Conta</h2>
        
        {/* Aviso se tiver indicação */}
        {referralCode && (
            <div className="mb-4 p-3 bg-[#C9A66B]/10 border border-[#C9A66B]/30 rounded-lg text-[#C9A66B] text-xs font-bold text-center uppercase tracking-wide">
               Você foi indicado por um parceiro VIP
            </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Nome Completo</label>
            <div className="relative">
                <User className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Ex: João Barbeiro"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#C9A66B] transition-colors"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Email Profissional</label>
            <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#C9A66B] transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Senha</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#C9A66B] transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold py-4 rounded-xl transition-all mt-4 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Cadastrar Agora <ArrowRight size={18}/></>}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
            Já tem uma conta? <Link href="/login" className="text-[#C9A66B] hover:underline font-bold">Faça Login</Link>
        </div>
    </div>
  );
}

// 2. A PÁGINA PRINCIPAL (Onde aplicamos a correção com Suspense)
export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">
            MASC <span className="text-[#C9A66B]">PRO</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2">Junte-se à elite.</p>
      </div>

      {/* AQUI ESTÁ A CORREÇÃO: Envolvemos o formulário em Suspense */}
      <Suspense fallback={<div className="text-white"><Loader2 className="animate-spin"/> Carregando...</div>}>
         <CadastroForm />
      </Suspense>

    </div>
  );
}