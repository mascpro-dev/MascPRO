"use client";

import { useState, useEffect, Suspense } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, User, Mail, Lock, Phone, MapPin, Home, Search, Building } from "lucide-react";
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
    zip_code: "",      
    address: "",       
    number: "",        
    complement: "",    // NOVO CAMPO: COMPLEMENTO
    neighborhood: "",  
    city: "",          
    state: "",         
  });

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefId(ref);
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "zip_code") {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 8) val = val.slice(0, 8);
        setFormData({ ...formData, zip_code: val });
    } else {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

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
        } else {
            alert("CEP não encontrado.");
        }
    } catch (error) {
        console.error("Erro ao buscar CEP", error);
    } finally {
        setBuscandoCep(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
        // 2. Salva no Banco (Com o campo complement)
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              id: user.id,
              email: formData.email,
              full_name: formData.name,
              whatsapp: formData.whatsapp,
              instagram: formData.instagram,
              
              // Endereço
              address: formData.address,
              number: formData.number,
              complement: formData.complement, // ENVIA O COMPLEMENTO
              neighborhood: formData.neighborhood,
              city: formData.city,
              state: formData.state,
              
              // Dados de Sistema
              indicado_por: refId || null,
              moedas_pro_acumuladas: 0,
              network_coins: 0,
              passive_pro: 0,
              store_coins: 0,
              role: "CABELEIREIRO",
              created_at: new Date().toISOString(),
            },
          ]);

        if (profileError) {
            console.error("Erro de Banco:", profileError);
            throw profileError;
        }

        router.push("/dashboard"); 
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-black italic text-[#C9A66B]">CRIE SUA CONTA</h1>
            <p className="text-gray-400 text-sm mt-2">Junte-se à elite MASC PRO.</p>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center mb-6">
                {error}
            </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
            <div className="relative">
                <User className="absolute left-3 top-3 text-gray-500" size={20} />
                <input required name="name" type="text" placeholder="Nome Completo" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
            </div>

            <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-500" size={20} />
                <input required name="email" type="email" placeholder="Seu melhor e-mail" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
            </div>

            <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-500" size={20} />
                <input required name="password" type="password" placeholder="Crie uma senha segura" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                    <Phone className="absolute left-3 top-3 text-gray-500" size={20} />
                    <input required name="whatsapp" type="text" placeholder="WhatsApp" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                </div>
                <div className="relative">
                    <input required name="instagram" type="text" placeholder="@instagram" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 px-4 text-white focus:border-[#C9A66B] outline-none" />
                </div>
            </div>

            <hr className="border-zinc-800 my-4" />
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Endereço Profissional</p>

            {/* CEP */}
            <div className="flex gap-2">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-3 text-gray-500" size={20} />
                    <input 
                        required 
                        name="zip_code" 
                        value={formData.zip_code}
                        type="text" 
                        placeholder="CEP (somente números)" 
                        onChange={handleChange} 
                        onBlur={buscarCep} 
                        className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" 
                    />
                </div>
                {buscandoCep && <div className="flex items-center text-[#C9A66B] text-xs"><Loader2 className="animate-spin" /></div>}
            </div>

            {/* Rua, Número e Complemento */}
            <div className="grid grid-cols-4 gap-4">
                {/* Rua ocupa 2 espaços */}
                <div className="col-span-2 relative">
                    <MapPin className="absolute left-3 top-3 text-gray-500" size={20} />
                    <input required name="address" value={formData.address} type="text" placeholder="Rua / Av." readOnly className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 pl-10 text-gray-400 cursor-not-allowed outline-none" />
                </div>
                
                {/* Número ocupa 1 espaço */}
                <div className="relative col-span-1">
                    <Home className="absolute left-3 top-3 text-gray-500" size={20} />
                    <input required name="number" type="text" placeholder="Nº" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                </div>

                 {/* Complemento ocupa 1 espaço */}
                 <div className="relative col-span-1">
                    <Building className="absolute left-3 top-3 text-gray-500" size={20} />
                    <input name="complement" type="text" placeholder="Comp." onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                </div>
            </div>

            {/* Bairro, Cidade, Estado */}
            <div className="grid grid-cols-2 gap-4">
                <input required name="neighborhood" value={formData.neighborhood} type="text" placeholder="Bairro" readOnly className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 px-4 text-gray-400 outline-none" />
                <div className="flex gap-2">
                    <input required name="city" value={formData.city} type="text" placeholder="Cidade" readOnly className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 px-4 text-gray-400 outline-none" />
                    <input required name="state" value={formData.state} type="text" placeholder="UF" readOnly className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg py-3 px-2 text-gray-400 text-center outline-none" />
                </div>
            </div>

            <button disabled={loading} type="submit" className="w-full bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold py-4 rounded-lg uppercase tracking-widest transition-all mt-6 flex items-center justify-center gap-2">
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