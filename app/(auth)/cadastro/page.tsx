"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Scissors, User, Mail, Phone, FileText, Lock, MapPin, Briefcase, Calendar, Clock, Home } from "lucide-react";

export default function CadastroPage() {
  // Campos obrigatórios
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [specialty, setSpecialty] = useState("cabeleireiro");
  const [experience, setExperience] = useState("");
  const [instagram, setInstagram] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");
  const [cityState, setCityState] = useState("");
  const [hasSchedule, setHasSchedule] = useState("");
  
  // Campo select
  const [workType, setWorkType] = useState("proprio");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Captura o ID do indicador salvo pelo Layout no navegador (Lógica de Rede Oculta)
      const referrerId = typeof window !== "undefined" ? localStorage.getItem("masc_referrer") : null;

      // 2. PRIMEIRO: Cria o usuário no Auth (apenas email e senha)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // 3. SEGUNDO: Atualiza a tabela profiles com TODOS os dados
      const profileData: any = {
        full_name: fullName,
        phone: phone,
        cpf: cpf,
        specialty: specialty,
        experience: experience,
        instagram: instagram,
        rua: rua,
        bairro: bairro,
        cep: cep,
        city_state: cityState,
        work_type: workType,
        has_schedule: hasSchedule === "sim", // Converte para boolean
        coins: 50,
      };

      // Adiciona invited_by apenas se existir
      if (referrerId) {
        profileData.invited_by = referrerId;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", authData.user.id);

      if (updateError) throw updateError;

      // 4. Limpa o indicador do navegador após o sucesso
      if (referrerId) localStorage.removeItem("masc_referrer");

      // 5. Redireciona para o onboarding do novo usuário
      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "Erro ao realizar cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Cabeçalho */}
        <div className="text-center">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            MASC<span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Crie sua conta como profissional Masc Pro</p>
        </div>

        {/* Container do Formulário (Estilo da Foto) */}
        <form onSubmit={handleSignUp} className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm font-bold text-center">
              {error}
            </div>
          )}

          {/* Qual seu Perfil? (Especialidade) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Qual seu Perfil?</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Scissors size={18} />
              </div>
              <select 
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white focus:outline-none focus:border-[#C9A66B] transition-all appearance-none cursor-pointer"
              >
                <option value="cabeleireiro">Sou Cabeleireiro(a)</option>
                <option value="barbeiro">Sou Barbeiro(a)</option>
                <option value="esteticista">Sou Esteticista</option>
                <option value="manicure">Sou Manicure/Pedicure</option>
                <option value="outro">Outro</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C9A66B] pointer-events-none w-5 h-5" />
            </div>
          </div>

          {/* Nome Completo */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <User size={18} />
              </div>
              <input
                type="text" 
                required 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                placeholder="Nome"
              />
            </div>
          </div>

          {/* E-mail */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Mail size={18} />
              </div>
              <input
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          {/* Instagram */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Instagram</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg font-bold">@</div>
              <input
                type="text" 
                required 
                value={instagram} 
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                placeholder="instagram profissional"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Phone size={18} />
              </div>
              <input
                type="tel" 
                required 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* CPF */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">CPF</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <FileText size={18} />
              </div>
              <input
                type="text" 
                required 
                value={cpf} 
                onChange={(e) => setCpf(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock size={18} />
              </div>
              <input
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                placeholder="******"
              />
            </div>
          </div>

          {/* Tempo de Experiência */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tempo de Experiência</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Clock size={18} />
              </div>
              <input
                type="text" 
                required 
                value={experience} 
                onChange={(e) => setExperience(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                placeholder="Ex: 5 anos"
              />
            </div>
          </div>

          {/* Rua */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Rua</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Home size={18} />
              </div>
              <input
                type="text" 
                required 
                value={rua} 
                onChange={(e) => setRua(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                placeholder="Nome da rua"
              />
            </div>
          </div>

          {/* Bairro */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Bairro</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <MapPin size={18} />
              </div>
              <input
                type="text" 
                required 
                value={bairro} 
                onChange={(e) => setBairro(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                placeholder="Nome do bairro"
              />
            </div>
          </div>

          {/* CEP */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">CEP</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <MapPin size={18} />
              </div>
              <input
                type="text" 
                required 
                value={cep} 
                onChange={(e) => setCep(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                placeholder="00000-000"
              />
            </div>
          </div>

          {/* Cidade/Estado */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cidade/Estado</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <MapPin size={18} />
              </div>
              <input
                type="text" 
                required 
                value={cityState} 
                onChange={(e) => setCityState(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                placeholder="Ex: São Paulo/SP"
              />
            </div>
          </div>

          {/* Tipo de Atuação */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tipo de Atuação</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Briefcase size={18} />
              </div>
              <select 
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white focus:outline-none focus:border-[#C9A66B] transition-all appearance-none cursor-pointer"
              >
                <option value="proprio">Salão Próprio</option>
                <option value="aluguel">Aluga Cadeira</option>
                <option value="comissao">Comissionado</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C9A66B] pointer-events-none w-5 h-5" />
            </div>
          </div>

          {/* Possui Agenda Online? */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Possui Agenda Online?</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Calendar size={18} />
              </div>
              <select 
                required
                value={hasSchedule} 
                onChange={(e) => setHasSchedule(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white focus:outline-none focus:border-[#C9A66B] transition-all appearance-none cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C9A66B] pointer-events-none w-5 h-5" />
            </div>
          </div>

          {/* Botão Finalizar Cadastro */}
          <button
            type="submit" 
            disabled={loading}
            className="w-full bg-[#C9A66B] text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm hover:opacity-90 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? "Processando..." : "Finalizar Cadastro"}
          </button>
        </form>

        {/* Link de Login */}
        <p className="text-center text-slate-400 text-sm">
          Já tem conta? <Link href="/login" className="text-[#C9A66B] font-bold hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}