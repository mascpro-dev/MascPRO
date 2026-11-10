"use client";

import { FormEvent, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function EntrarForcaPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) {
      setErro("E-mail ou senha não conferem.");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    const destino = next && next.startsWith("/forca") ? next : "/forca";
    router.push(destino);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white">
      <form onSubmit={(e) => void entrar(e)} className="mx-auto w-full max-w-sm space-y-4">
        <img src="/icon-forca.png" alt="Força de Vendas" className="h-16 w-16 rounded-2xl" />
        <h1 className="text-2xl font-black">Força de Vendas</h1>
        <p className="text-sm text-zinc-400">Entre para abrir só a Força. O Masc PRO fica no outro ícone.</p>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          required
          className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
        />
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          required
          className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
        />
        <button type="submit" disabled={enviando} className="w-full rounded-xl bg-[#C9A66B] py-3 text-sm font-black text-black disabled:opacity-40">
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
