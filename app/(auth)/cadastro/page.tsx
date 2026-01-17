"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { Loader2, User, Mail, Lock, ArrowRight } from "lucide-react";

function CadastroForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  // Pega o código do padrinho da URL
  const referralCode = searchParams.get("ref");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Cria conta
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

    // 2. Se tiver indicação, salva o padrinho no banco
    if (referralCode && authData.user) {
      await supabase
        .from("profiles")
        .update({ referred_by: referralCode })
        .eq("id", authData.user.id);
    }

    alert("Cadastro realizado! Faça login.");
    router.push("/login");
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300">
        <h2 className="text-2xl font-bold text-white mb-6">Criar Conta</h2>
        
        {referralCode && (
            <div className="mb-4 p-3 bg-[#C9A66B]/10 border border-[#C9A66B]/30 rounded-lg text-[#C9A66B] text-xs font-bold text-center uppercase tracking-wide">
               Indicação Validada: Você ganhará bônus ao evoluir!
            </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Nome</label>
            <div className="relative">
                <User className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Ex: Seu Nome"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#C9A66B] transition-colors"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
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

// Página principal com Suspense (Essencial para não dar erro)
export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">
            MASC <span className="text-[#C9A66B]">PRO</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2">Junte-se à elite.</p>
      </div>
      <Suspense fallback={<div className="text-white">Carregando...</div>}>
         <CadastroForm />
      </Suspense>
    </div>
  );
}