"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react"; // Ícone de carregamento

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Tenta fazer login no Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciais inválidas ou acesso negado.");
      setLoading(false);
    } else {
      // Se der certo, o Middleware e o Router empurram para a Home
      router.refresh();
      router.push("/home");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-bold text-white">Bem-vindo</h2>
        <p className="text-slate-400 text-sm">
          Acesso exclusivo para membros MASC PRO.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="Seu e-mail cadastrado"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
            required
          />
        </div>
        
        <div>
          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
            required
          />
        </div>

        {error && (
          <div className="text-red-400 text-xs text-center bg-red-950/30 p-2 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white hover:bg-slate-200 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : "Entrar na Plataforma"}
        </button>
      </form>

      <div className="py-8 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-900 px-2 text-slate-500">Restrito</span>
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-4 text-center">
          Não tem convite? Você precisa de uma indicação.
        </p>
        <Link 
          href="https://wa.me/5514991570389?text=Sou%20cabeleireiro(a)%20e%20gostaria%20de%20solicitar%20acesso%20ao%20MASC%20PRO"
          target="_blank"
          className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors text-sm uppercase tracking-wide text-center"
        >
          Pedir Link no WhatsApp
        </Link>
      </div>
    </div>
  );
}