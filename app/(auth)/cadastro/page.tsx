"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Eye, EyeOff, User, Mail, MapPin, Lock, Scissors } from "lucide-react";

export default function CadastroPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Captura o ID de quem indicou lá do link da sua Rede (?ref=ID)
  const indicadorId = searchParams.get("ref");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    perfil: "cabeleireiro",
    endereco: "",
    complemento: "" 
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
            nivel: formData.perfil,
            endereco: formData.endereco,
            complemento: formData.complemento,
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
        specialty: formData.perfil,
        endereco: formData.endereco,
        complemento: formData.complemento,
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
      setError(err.message || "Erro ao cadastrar: verifique os dados ou se o e-mail já existe.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center font-sans">
      {/* Bloqueio de auto-preenchimento para vir sempre limpo */}
      <form onSubmit={handleSignUp} className="w-full max-w-md space-y-4" autoComplete="off">
        
        <div className="text-center mb-8">
            <h1 className="text-4xl font-black italic tracking-tighter">MASC<span className="text-[#C9A66B]">PRO</span></h1>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] mt-2">Cadastro de Profissional</p>
            {indicadorId && (
              <p className="text-[#C9A66B] text-[9px] font-bold mt-2 uppercase">Indicado por: {indicadorId.substring(0,8)}...</p>
            )}
        </div>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-xs text-center">{error}</div>}

        {/* CATEGORIA (Nivel) */}
        <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Categoria</label>
            <div className="relative">
                <Scissors className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C9A66B]" size={18} />
                <select 
                    value={formData.perfil}
                    onChange={(e) => setFormData({...formData, perfil: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 h-14 pl-12 rounded-xl appearance-none focus:border-[#C9A66B] outline-none text-sm"
                >
                    <option value="cabeleireiro">Cabeleireiro(a)</option>
                    <option value="distribuidor">Distribuidor</option>
                    <option value="embaixador">Embaixador</option>
                </select>
            </div>
        </div>

        {/* NOME COMPLETO */}
        <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
                type="text"
                placeholder="Nome Completo"
                required
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="w-full bg-zinc-900 border border-white/10 h-14 pl-12 rounded-xl outline-none text-sm"
            />
        </div>

        {/* EMAIL (Limpando o cache do navegador) */}
        <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
                type="email"
                name="new-email-mascpro"
                placeholder="Seu melhor e-mail"
                required
                autoComplete="off"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-zinc-900 border border-white/10 h-14 pl-12 rounded-xl outline-none text-sm"
            />
        </div>

        {/* SENHA COM FUNÇÃO DE MOSTRAR */}
        <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
                type={showPassword ? "text" : "password"}
                name="new-password-mascpro"
                placeholder="Crie sua senha"
                required
                autoComplete="new-password"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-zinc-900 border border-white/10 h-14 pl-12 pr-12 rounded-xl outline-none text-sm"
            />
            <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>

        {/* ENDEREÇO E COMPLEMENTO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                    type="text"
                    placeholder="Endereço"
                    onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 h-14 pl-12 rounded-xl outline-none text-sm"
                />
            </div>
            <input 
                type="text"
                placeholder="Complemento"
                onChange={(e) => setFormData({...formData, complemento: e.target.value})}
                className="w-full bg-zinc-900 border border-white/10 h-14 px-4 rounded-xl outline-none text-sm"
            />
        </div>

        <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black h-14 rounded-xl font-black uppercase text-xs tracking-[0.3em] hover:bg-[#C9A66B] transition-all active:scale-95 shadow-xl mt-4 disabled:opacity-50"
        >
            {loading ? "Processando..." : "Finalizar Cadastro"}
        </button>
      </form>
    </div>
  );
}
