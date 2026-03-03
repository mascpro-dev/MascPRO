"use client";

import { useState, useEffect, Suspense } from "react"; // Adicionei Suspense
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, User, Mail, Lock, Phone, MapPin, Home } from "lucide-react";
import Link from "next/link";

// 1. CRIAMOS UM COMPONENTE SÓ PARA O CONTEÚDO (Onde usamos useSearchParams)
function CadastroContent() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams(); // Agora está seguro aqui dentro
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);

  // DADOS DO FORMULÁRIO
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    whatsapp: "",
    instagram: "",
    address: "",       
    number: "",        
    neighborhood: "",  
    city: "",          
    state: "",         
  });

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefId(ref);
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Cria usuário
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (user) {
        // 2. Salva no Banco
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
              neighborhood: formData.neighborhood,
              city: formData.city,
              state: formData.state,
              
              // Rede e Financeiro
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
            console.error("Erro ao salvar perfil:", profileError);
            throw new Error("Erro ao salvar dados no banco.");
        }

        router.push("/dashboard"); 
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro ao criar a conta.");
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

            <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-500" size={20} />
                <input required name="whatsapp" type="text" placeholder="WhatsApp (com DDD)" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 relative">
                    <MapPin className="absolute left-3 top-3 text-gray-500" size={20} />
                    <input required name="address" type="text" placeholder="Endereço (Rua, Av...)" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                </div>
                
                <div className="relative">
                    <Home className="absolute left-3 top-3 text-gray-500" size={20} />
                    <input required name="number" type="text" placeholder="Número" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none" />
                </div>

                <div className="relative">
                    <input required name="neighborhood" type="text" placeholder="Bairro" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 px-4 text-white focus:border-[#C9A66B] outline-none" />
                </div>

                <div className="relative">
                    <input required name="city" type="text" placeholder="Cidade" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 px-4 text-white focus:border-[#C9A66B] outline-none" />
                </div>

                <div className="relative">
                    <input required name="state" type="text" placeholder="Estado (UF)" onChange={handleChange} className="w-full bg-black border border-zinc-700 rounded-lg py-3 px-4 text-white focus:border-[#C9A66B] outline-none" />
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

// 2. AGORA A PÁGINA PRINCIPAL APENAS SEGURA O "ENVELOPE" (SUSPENSE)
export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-[#C9A66B]">Carregando formulário...</div>}>
        <CadastroContent />
      </Suspense>
    </div>
  );
}