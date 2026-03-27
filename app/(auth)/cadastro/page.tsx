"use client";

import { useState, useEffect, Suspense } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, User, Mail, Lock, Phone, MapPin, Home, Search, Building, Briefcase, Calendar, Clock, FileText } from "lucide-react";
import Link from "next/link";

function CadastroContent() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // DADOS DO FORMULÁRIO
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    whatsapp: "",
    instagram: "",
    cpf: "",           // VOLTOU!
    work_type: "",     // VOLTOU! (Salão Próprio, etc)
    experience: "",    // VOLTOU! (Tempo de profissão)
    has_schedule: "",  // VOLTOU! (Agenda Online - "sim" ou "nao")
    
    // Endereço
    zip_code: "",      
    address: "",       
    number: "",        
    complement: "",    
    neighborhood: "",  
    city: "",          
    state: "",         
  });

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefId(ref);
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let val = e.target.value;
    const name = e.target.name;

    // Máscara de CEP
    if (name === "zip_code") {
        val = val.replace(/\D/g, "").slice(0, 8);
    }
    // Máscara de CPF simples
    if (name === "cpf") {
        val = val.replace(/\D/g, "").slice(0, 11);
        val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }

    setFormData({ ...formData, [name]: val });
  };

  // Função para setar valores dos botões (Work Type e Agenda)
  const setOption = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  }

  const buscarCep = async () => {
    const cep = formData.zip_code.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setBuscandoCep(true);
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (!data.erro) {
            setFormData(prev => ({
                ...prev,
                address: data.logradouro,
                neighborhood: data.bairro,
                city: data.localidade,
                state: data.uf
            }));
        }
    } catch (error) {
        console.error("Erro CEP", error);
    } finally {
        setBuscandoCep(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validações básicas
    if (!formData.work_type) { setError("Selecione sua situação profissional."); setLoading(false); return; }
    if (!formData.has_schedule) { setError("Informe se possui agenda online."); setLoading(false); return; }

    try {
      // 1. Cria usuário Auth
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.name },
        },
      });

      if (signUpError) throw signUpError;

      if (user) {
        // 2. Salva no Banco (TODOS OS CAMPOS)
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert([ // Usamos UPSERT para garantir que se o trigger criar, a gente atualiza
            {
              id: user.id,
              email: formData.email,
              full_name: formData.name,
              whatsapp: formData.whatsapp,
              instagram: formData.instagram,
              cpf: formData.cpf,
              
              // Profissional
              work_type: formData.work_type,
              experience: formData.experience,
              has_schedule: formData.has_schedule === "sim", // Converte para boolean (true/false)
              
              // Endereço
              address: formData.address,
              number: formData.number,
              complement: formData.complement,
              neighborhood: formData.neighborhood,
              city: formData.city,
              state: formData.state,
              
              // Sistema
              indicado_por: refId || null,
              moedas_pro_acumuladas: 0,
              network_coins: 0,
              passive_pro: 0,
              role: "CABELEIREIRO",
              updated_at: new Date().toISOString(),
            },
          ]);

        if (profileError) throw profileError;

        router.push("/dashboard"); 
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl my-10">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-black italic text-[#C9A66B]">FICHA DE MEMBRO</h1>
            <p className="text-gray-400 text-sm mt-2">Preencha seus dados para acessar a plataforma.</p>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center mb-6 font-bold">
                {error}
            </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-5">
            
            {/* DADOS DE ACESSO */}
            <div className="space-y-4">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest border-b border-zinc-800 pb-2">Dados de Acesso</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input required name="name" type="text" placeholder="Nome Completo" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                    </div>
                    <div className="relative">
                        <FileText className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input required name="cpf" value={formData.cpf} type="text" placeholder="CPF" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input required name="email" type="email" placeholder="E-mail" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input required name="password" type="password" placeholder="Senha" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Phone className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input required name="whatsapp" type="text" placeholder="WhatsApp" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                    </div>
                    <div className="relative">
                        <input required name="instagram" type="text" placeholder="@instagram" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 px-4 text-white focus:border-[#C9A66B] outline-none" />
                    </div>
                </div>
            </div>

            {/* PERFIL PROFISSIONAL (Novos Campos) */}
            <div className="space-y-4 pt-4">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest border-b border-zinc-800 pb-2">Perfil Profissional</p>
                
                {/* Situação Profissional */}
                <div>
                    <label className="text-sm text-gray-400 mb-2 block">Qual sua situação atual?</label>
                    <div className="grid grid-cols-3 gap-2">
                        {["Salão Próprio", "Alugo Cadeira", "Comissionado"].map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => setOption("work_type", opt)}
                                className={`py-2 px-1 text-xs font-bold uppercase rounded border transition-all ${
                                    formData.work_type === opt 
                                    ? "bg-[#C9A66B] text-black border-[#C9A66B]" 
                                    : "bg-black text-gray-500 border-zinc-800 hover:border-gray-600"
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tempo de Experiência */}
                    <div className="relative">
                        <Clock className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input required name="experience" type="text" placeholder="Tempo de Profissão (ex: 5 anos)" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                    </div>
                    
                    {/* Agenda Online */}
                    <div className="flex flex-col justify-center">
                         <p className="text-xs text-gray-500 mb-2">Possui Agenda Online?</p>
                         <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="has_schedule" checked={formData.has_schedule === "sim"} onChange={() => setOption("has_schedule", "sim")} className="accent-[#C9A66B]" />
                                <span className="text-sm text-white">Sim</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="has_schedule" checked={formData.has_schedule === "nao"} onChange={() => setOption("has_schedule", "nao")} className="accent-[#C9A66B]" />
                                <span className="text-sm text-white">Não</span>
                            </label>
                         </div>
                    </div>
                </div>
            </div>

            {/* ENDEREÇO */}
            <div className="space-y-4 pt-4">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest border-b border-zinc-800 pb-2">Endereço</p>
                
                <div className="flex gap-2">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input required name="zip_code" value={formData.zip_code} type="text" placeholder="CEP" onChange={handleChange} onBlur={buscarCep} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                    </div>
                    {buscandoCep && <div className="flex items-center text-[#C9A66B] text-xs"><Loader2 className="animate-spin" /></div>}
                </div>

                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2 relative">
                        <MapPin className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input required name="address" value={formData.address} type="text" placeholder="Rua" readOnly className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 pl-10 text-gray-400 cursor-not-allowed outline-none" />
                    </div>
                    <div className="relative col-span-1">
                        <Home className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input required name="number" type="text" placeholder="Nº" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                    </div>
                    <div className="relative col-span-1">
                        <Building className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input name="complement" type="text" placeholder="Comp." onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input required name="neighborhood" value={formData.neighborhood} type="text" placeholder="Bairro" readOnly className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 px-4 text-gray-400 outline-none" />
                    <div className="flex gap-2">
                        <input required name="city" value={formData.city} type="text" placeholder="Cidade" readOnly className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 px-4 text-gray-400 outline-none" />
                        <input required name="state" value={formData.state} type="text" placeholder="UF" readOnly className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg py-3 px-2 text-gray-400 text-center outline-none" />
                    </div>
                </div>
            </div>

            <button disabled={loading} type="submit" className="w-full bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold py-4 rounded-lg uppercase tracking-widest transition-all mt-6 flex items-center justify-center gap-2 shadow-lg shadow-[#C9A66B]/20">
                {loading ? <Loader2 className="animate-spin" /> : "FINALIZAR CADASTRO"}
            </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
            Já tem uma conta? <Link href="/login" className="text-[#C9A66B] hover:underline">Faça Login</Link>
        </p>
      </div>
  );
}

export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-[#C9A66B]">Carregando...</div>}>
        <CadastroContent />
      </Suspense>
    </div>
  );
}