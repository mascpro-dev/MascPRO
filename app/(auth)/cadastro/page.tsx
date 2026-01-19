"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState, Suspense } from "react"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Phone, User, Lock, Mail, FileText, Briefcase, Scissors } from "lucide-react";

function CadastroForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    instagram: "",
    whatsapp: "",
    cpf: "",
    role: "cabeleireiro", 
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter(); 
  const supabase = createClientComponentClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // TRATAMENTO DO INSTAGRAM: Garante que tenha o @
      let instaFinal = formData.instagram.trim();
      if (!instaFinal.startsWith("@")) {
          instaFinal = `@${instaFinal}`;
      }

      // TRATAMENTO DO WHATSAPP E CPF (Remove formatação para salvar limpo se quiser, ou mantem)
      // Aqui estamos enviando como string formatada mesmo.

      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: instaFinal.replace("@", ""), 
            role: formData.role,
            instagram: instaFinal, // Salva já com o @
            whatsapp: formData.whatsapp,
            cpf: formData.cpf,
          },
        },
      });

      if (authError) throw authError;

      router.refresh();
      router.push("/");

    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar.");
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

          {/* SELETOR */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#C9A66B] uppercase">Qual seu perfil?</label>
            <div className="relative">
                {formData.role === 'cabeleireiro' ? <Scissors className="absolute left-3 top-3.5 text-[#C9A66B]" size={18} /> : <Briefcase className="absolute left-3 top-3.5 text-[#C9A66B]" size={18} />}
                <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-black border border-[#C9A66B]/50 rounded-xl py-3 pl-10 pr-4 text-white outline-none cursor-pointer">
                    <option value="cabeleireiro">Sou Cabeleireiro(a)</option>
                    <option value="distribuidor">Sou Distribuidor(a)</option>
                </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
            <div className="relative"><User className="absolute left-3 top-3 text-slate-500" size={18} /><input name="fullName" required placeholder="Nome" className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-[#C9A66B]" onChange={handleChange} /></div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
            <div className="relative"><Mail className="absolute left-3 top-3 text-slate-500" size={18} /><input name="email" type="email" required placeholder="email@exemplo.com" className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-[#C9A66B]" onChange={handleChange} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* CAMPO INSTAGRAM COM @ FIXO */}
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Instagram</label>
                <div className="relative">
                    {/* O @ VISUAL */}
                    <span className="absolute left-3 top-3 text-slate-500 font-bold select-none">@</span>
                    <input 
                        name="instagram" 
                        placeholder="seu.usuario" 
                        // padding-left maior (pl-8) para não escrever em cima do @
                        className="w-full bg-black border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white outline-none focus:border-[#C9A66B]" 
                        onChange={handleChange} 
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp</label>
                <div className="relative"><Phone className="absolute left-3 top-3 text-slate-500" size={18} /><input name="whatsapp" placeholder="(00) 00000-0000" className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-[#C9A66B]" onChange={handleChange} /></div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">CPF</label>
            <div className="relative"><FileText className="absolute left-3 top-3 text-slate-500" size={18} /><input name="cpf" placeholder="000.000.000-00" className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-[#C9A66B]" onChange={handleChange} /></div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
            <div className="relative"><Lock className="absolute left-3 top-3 text-slate-500" size={18} /><input name="password" type="password" required placeholder="******" className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-[#C9A66B]" onChange={handleChange} /></div>
          </div>

          <button disabled={loading} className="w-full bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : "FINALIZAR CADASTRO"}
          </button>
          
          <p className="text-center text-slate-500 text-sm mt-4">Já tem conta? <Link href="/login" className="text-[#C9A66B] hover:underline">Entrar</Link></p>
        </form>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white text-center">Carregando...</div>}>
        <CadastroForm />
      </Suspense>
    </div>
  );
}