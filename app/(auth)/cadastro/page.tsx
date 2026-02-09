"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Eye, EyeOff, User, Mail, MapPin, Lock, Phone, Instagram, FileText, Clock, Briefcase, Calendar, Loader2 } from "lucide-react";

function CadastroForm() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const indicadorId = searchParams.get("ref");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    cpf: "",
    whatsapp: "",
    instagram: "",
    cep: "",
    rua: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    tempoExperiencia: "",
    statusProfissional: "Salão Próprio",
    agendaOnline: "não"
  });

  // Captura o código de referência da URL e salva no localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && indicadorId) {
      localStorage.setItem("masc_referrer", indicadorId);
      console.log("Código de referência salvo no localStorage:", indicadorId);
      // Limpa a URL para ficar profissional
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [indicadorId]);

  // Busca automática de CEP
  useEffect(() => {
    const cleanCep = formData.cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        .then(res => res.json())
        .then(data => {
          if (!data.erro) {
            setFormData(prev => ({
              ...prev,
              rua: data.logradouro || "",
              bairro: data.bairro || "",
              cidade: data.localidade || "",
              uf: data.uf || ""
            }));
          }
        })
        .catch(err => {
          console.error("Erro ao buscar CEP:", err);
        });
    }
  }, [formData.cep]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. RESGATE DO PADRINHO: OBRIGATORIAMENTE lê do localStorage (pode vir da URL ou já estar salvo)
      const referrerId = typeof window !== "undefined" 
        ? (localStorage.getItem("masc_referrer") || indicadorId) 
        : indicadorId;
      console.log("Código de referência lido:", referrerId);

      // 2. Faz o signUp no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: formData.fullName,
            nivel: 'cabeleireiro',
            cpf: formData.cpf,
            whatsapp: formData.whatsapp,
            instagram: formData.instagram,
            cep: formData.cep,
            rua: formData.rua,
            complemento: formData.complemento,
            bairro: formData.bairro,
            cidade: formData.cidade,
            uf: formData.uf,
            tempo_experiencia: formData.tempoExperiencia,
            status_profissional: formData.statusProfissional,
            agenda_online: formData.agendaOnline,
          }
        }
      });

      // Se der erro de 'User already registered', prossegue (caso do usuário zumbi)
      if (authError && authError.message !== "User already registered") {
        throw authError;
      }

      // 3. Obtém o ID do usuário (do signUp ou da sessão atual se já existir)
      let userId: string;
      if (authData?.user) {
        userId = authData.user.id;
      } else {
        // Se o usuário já existe, busca da sessão atual
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error("Erro ao obter ID do usuário");
        }
        userId = session.user.id;
      }

      // 4. PREPARAÇÃO DOS DADOS: Monta objeto updates para salvar na tabela profiles
      const updates: any = {
        full_name: formData.fullName,
        cpf: formData.cpf,
        phone: formData.whatsapp,
        instagram: formData.instagram,
        specialty: 'cabeleireiro',
        experience: formData.tempoExperiencia,
        cep: formData.cep,
        rua: formData.rua,
        complemento: formData.complemento,
        bairro: formData.bairro,
        city_state: formData.cidade && formData.uf ? `${formData.cidade}/${formData.uf}` : "",
        work_type: formData.statusProfissional === "Salão Próprio" ? "proprio" : formData.statusProfissional === "Alugo Cadeira" ? "aluguel" : "comissao",
        has_schedule: formData.agendaOnline === "sim",
        invited_by: referrerId, // OBRIGATORIAMENTE envia o código de referência para a coluna invited_by
        coins: 50,
        updated_at: new Date().toISOString(),
      };

      // 5. Atualiza o perfil na tabela profiles
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (updateError) {
        console.error("Erro ao atualizar perfil:", updateError);
        throw updateError;
      }

      // Limpa o indicador do navegador após o sucesso
      if (referrerId && typeof window !== "undefined") {
        localStorage.removeItem("masc_referrer");
      }

      // 6. REDIRECIONAMENTO: Se tudo der certo, manda para /onboarding
      router.push("/onboarding");
    } catch (err: any) {
      console.error("Erro no cadastro:", err);
      setError(err.message || "Erro ao cadastrar: Verifique se os dados estão corretos.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="w-full max-w-2xl bg-zinc-900/50 p-8 rounded-3xl border border-white/5 space-y-6 shadow-2xl" autoComplete="off">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black italic tracking-tighter text-white">MASC<span className="text-[#C9A66B]">PRO</span></h1>
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] mt-2">Crie sua conta profissional</p>
        {indicadorId && (
          <p className="text-[#C9A66B] text-[9px] font-bold mt-2 uppercase">Convite Ativo</p>
        )}
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-xs text-center">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DADOS PESSOAIS */}
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input type="text" placeholder="Nome Completo" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-black border border-white/10 h-14 pl-12 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
        </div>

        <div className="relative">
          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input type="text" placeholder="CPF" required value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} className="w-full bg-black border border-white/10 h-14 pl-12 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
        </div>

        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input type="email" placeholder="E-mail" required autoComplete="new-email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-black border border-white/10 h-14 pl-12 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
        </div>

        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input type="text" placeholder="WhatsApp" required value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full bg-black border border-white/10 h-14 pl-12 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
        </div>

        <div className="relative">
          <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input type="text" placeholder="Instagram (@usuario)" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} className="w-full bg-black border border-white/10 h-14 pl-12 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
        </div>

        <div className="relative">
          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input type="text" placeholder="Tempo de Carreira (ex: 5 anos)" value={formData.tempoExperiencia} onChange={e => setFormData({...formData, tempoExperiencia: e.target.value})} className="w-full bg-black border border-white/10 h-14 pl-12 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
        </div>
      </div>

      {/* ENDEREÇO */}
      <div className="pt-4 border-t border-white/5 space-y-4">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Endereço Profissional</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input type="text" placeholder="CEP" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} className="col-span-1 bg-black border border-white/10 h-14 px-4 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
          <input type="text" placeholder="Rua" value={formData.rua} onChange={e => setFormData({...formData, rua: e.target.value})} className="col-span-1 md:col-span-2 bg-black border border-white/10 h-14 px-4 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
          <input type="text" placeholder="UF" value={formData.uf} maxLength={2} onChange={e => setFormData({...formData, uf: e.target.value.toUpperCase()})} className="bg-black border border-white/10 h-14 px-4 rounded-xl outline-none text-white text-center focus:border-[#C9A66B]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="Bairro" value={formData.bairro} onChange={e => setFormData({...formData, bairro: e.target.value})} className="bg-black border border-white/10 h-14 px-4 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
          <input type="text" placeholder="Cidade" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} className="bg-black border border-white/10 h-14 px-4 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
          <input type="text" placeholder="Complemento" value={formData.complemento} onChange={e => setFormData({...formData, complemento: e.target.value})} className="bg-black border border-white/10 h-14 px-4 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
        </div>
      </div>

      {/* STATUS PROFISSIONAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Vínculo Profissional</label>
          <select value={formData.statusProfissional} onChange={e => setFormData({...formData, statusProfissional: e.target.value})} className="w-full bg-black border border-white/10 h-14 px-4 rounded-xl outline-none text-white text-sm focus:border-[#C9A66B]">
            <option value="Salão Próprio">Tenho Salão Próprio</option>
            <option value="Alugo Cadeira">Alugo Cadeira</option>
            <option value="Sou Comissionado">Sou Comissionado</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Usa Agenda Online?</label>
          <select value={formData.agendaOnline} onChange={e => setFormData({...formData, agendaOnline: e.target.value})} className="w-full bg-black border border-white/10 h-14 px-4 rounded-xl outline-none text-white text-sm focus:border-[#C9A66B]">
            <option value="sim">Sim, utilizo</option>
            <option value="não">Não utilizo</option>
          </select>
        </div>
      </div>

      {/* SENHA */}
      <div className="relative pt-4">
        <Lock className="absolute left-4 top-[calc(50%+8px)] -translate-y-1/2 text-zinc-500" size={18} />
        <input type={showPassword ? "text" : "password"} placeholder="Crie sua senha" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} autoComplete="new-password" className="w-full bg-black border border-white/10 h-14 pl-12 pr-12 rounded-xl outline-none text-white focus:border-[#C9A66B]" />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[calc(50%+8px)] -translate-y-1/2 text-zinc-500 hover:text-white">
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-[#C9A66B] text-black h-16 rounded-2xl font-black uppercase text-xs tracking-[0.3em] hover:bg-white transition-all active:scale-95 shadow-xl disabled:opacity-50">
        {loading ? "Processando..." : "Finalizar Cadastro"}
      </button>
    </form>
  );
}

export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-12">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#C9A66B]" size={40} />
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Iniciando ambiente seguro...</p>
        </div>
      }>
        <CadastroForm />
      </Suspense>
    </div>
  );
}
