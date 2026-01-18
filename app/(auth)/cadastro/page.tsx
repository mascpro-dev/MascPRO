"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState, Suspense } from "react"; 
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Instagram, Phone, User, Lock, Mail, FileText } from "lucide-react";

// 1. O FORMULÁRIO FICA AQUI (Componente separado)
function CadastroForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    instagram: "",
    whatsapp: "",
    cpf: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams(); // O erro acontece se isso não estiver dentro de Suspense
  const supabase = createClientComponentClient();
  const refId = searchParams.get("ref");

  // Funções de formatação
  const formatCPF = (value: string) => {
    return value.replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const formatPhone = (value: string) => {
    return value.replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (e.target.name === "cpf") value = formatCPF(value);
    if (e.target.name === "whatsapp") value = formatPhone(value);
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: formData.instagram.replace("@", ""),
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Atualiza os dados extras no perfil
        await supabase.from("profiles").update({
            instagram: formData.instagram,
            whatsapp: formData.whatsapp,
            cpf: formData.cpf,
            invited_by: refId || null,
          }).eq("id", authData.user.id);
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
        <div className="text-center">
          <h1 className="text-3xl font-black text-white italic tracking-tighter">
            MASC <span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-slate-500 mt-2">Crie sua conta de membro fundador.</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4 bg-[#0A0A0A] p-8 rounded-2xl border border-white/10">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">{error}</div>}

          {/* CAMPOS DO FORMULÁRIO */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
            <div className="relative"><User className="absolute left-3 top-3 text-slate-500" size={18} /><input name="fullName" required placeholder="Seu nome" className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#C9A66B] outline-none" onChange={handleChange} /></div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
            <div className="relative"><Mail className="absolute left-3 top-3 text-slate-500" size={18} /><input name="email" type="email" required placeholder="seu@email.com" className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#C9A66B] outline-none" onChange={handleChange} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Instagram</label>
                <div className="relative"><Instagram className="absolute left-3 top-3 text-slate-500" size={18} /><input name="instagram" required placeholder="@usuario" className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#C9A66B] outline-none" onChange={handleChange} /></div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp</label>
                <div className="relative"><Phone className="absolute left-3 top-3 text-slate-500" size={18} /><input name="whatsapp" required placeholder="(00) 00000-0000" value={formData.whatsapp} maxLength={15} className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#C9A66B] outline-none" onChange={handleChange} /></div>
              </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">CPF</label>
            <div className="relative"><FileText className="absolute left-3 top-3 text-slate-500" size={18} /><input name="cpf" required placeholder="000.000.000-00" value={formData.cpf} maxLength={14} className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#C9A66B] outline-none" onChange={handleChange} /></div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
            <div className="relative"><Lock className="absolute left-3 top-3 text-slate-500" size={18} /><input name="password" type="password" required placeholder="******" className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#C9A66B] outline-none" onChange={handleChange} /></div>
          </div>

          <button disabled={loading} className="w-full bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold py-4 rounded-xl transition-all active:scale-95 mt-4 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : null}
            {loading ? "Criando..." : "FINALIZAR CADASTRO"}
          </button>
          
          <p className="text-center text-slate-500 text-sm mt-4">Já tem conta? <Link href="/login" className="text-[#C9A66B] hover:underline">Entrar</Link></p>
        </form>
    </div>
  );
}

// 2. A PÁGINA PRINCIPAL (Onde o erro é corrigido com Suspense)
export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* O Suspense aqui embaixo é o que resolve o erro vermelho do console */}
      <Suspense fallback={<div className="text-white text-center">Carregando formulário...</div>}>
        <CadastroForm />
      </Suspense>
    </div>
  );
}