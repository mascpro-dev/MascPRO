"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, User, Mail, Lock, Phone, MapPin, Home, Search, Building, Clock, FileText } from "lucide-react";
import Link from "next/link";

function CadastroContent() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepMsg, setCepMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    whatsapp: "",
    instagram: "",
    cpf: "",
    work_type: "",
    experience: "",
    has_schedule: "",
    zip_code: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("invite");
    if (ref) setRefId(ref);
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let val = e.target.value;
    const name = e.target.name;

    if (name === "zip_code") {
      val = val.replace(/\D/g, "").slice(0, 8);
      if (val.length === 8) {
        void buscarCep(val);
      }
    }
    if (name === "cpf") {
      const d = val.replace(/\D/g, "").slice(0, 11);
      val = d
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    if (name === "state") {
      val = val.toUpperCase().slice(0, 2);
    }

    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const setOption = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const buscarCep = useCallback(async (cepInput?: string) => {
    const cep = (cepInput ?? formData.zip_code).replace(/\D/g, "");
    if (cep.length !== 8) return;

    setBuscandoCep(true);
    setCepMsg(null);
    try {
      const response = await fetch(`/api/cep/${cep}`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setCepMsg(data.error || "CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        zip_code: cep,
        address: data.logradouro || prev.address,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      setCepMsg(data.logradouro ? null : "CEP genérico — complete rua e bairro manualmente.");
    } catch {
      setCepMsg("Não foi possível buscar o CEP. Preencha o endereço manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  }, [formData.zip_code]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.work_type) {
      setError("Selecione sua situação profissional.");
      setLoading(false);
      return;
    }
    if (!formData.has_schedule) {
      setError("Informe se possui agenda online.");
      setLoading(false);
      return;
    }
    const cep = formData.zip_code.replace(/\D/g, "");
    if (cep.length !== 8) {
      setError("Informe um CEP válido.");
      setLoading(false);
      return;
    }
    if (!formData.address.trim() || !formData.city.trim() || !formData.state.trim()) {
      setError("Preencha endereço, cidade e UF.");
      setLoading(false);
      return;
    }

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.name.trim(),
            indicado_por: refId || null,
          },
        },
      });

      if (signUpError) throw signUpError;

      const session = signUpData.session;
      const user = signUpData.user;

      if (!user) {
        setError("Não foi possível criar a conta. Tente outro e-mail.");
        setLoading(false);
        return;
      }

      if (!session?.access_token) {
        setError(
          "Conta criada! Verifique seu e-mail e clique no link de confirmação. Depois faça login — seu perfil será concluído no primeiro acesso."
        );
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          full_name: formData.name.trim(),
          whatsapp: formData.whatsapp,
          instagram: formData.instagram,
          cpf: formData.cpf,
          work_type: formData.work_type,
          experience: formData.experience,
          has_schedule: formData.has_schedule,
          cep,
          address: formData.address,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          indicado_por: refId,
        }),
      });

      const profileData = await res.json().catch(() => ({}));
      if (!res.ok || !profileData?.ok) {
        throw new Error(profileData?.error || "Erro ao salvar seu perfil.");
      }

      router.push("/onboarding");
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro ao criar conta.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-black border border-zinc-700 rounded-lg py-3 pl-10 text-white focus:border-[#C9A66B] outline-none";

  return (
    <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl my-10">
        <h1 className="text-3xl font-black italic text-[#C9A66B]">FICHA DE MEMBRO</h1>
        <p className="text-gray-400 text-sm mt-2">Preencha seus dados para acessar a plataforma.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center mb-6 font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-5">
        <div className="space-y-4">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest border-b border-zinc-800 pb-2">
            Dados de Acesso
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                required
                name="name"
                type="text"
                value={formData.name}
                placeholder="Nome Completo"
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                required
                name="cpf"
                value={formData.cpf}
                type="text"
                placeholder="CPF"
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                required
                name="email"
                type="email"
                value={formData.email}
                placeholder="E-mail"
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                required
                name="password"
                type="password"
                value={formData.password}
                placeholder="Senha (mín. 6 caracteres)"
                minLength={6}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                required
                name="whatsapp"
                type="text"
                value={formData.whatsapp}
                placeholder="WhatsApp"
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="relative">
              <input
                required
                name="instagram"
                type="text"
                value={formData.instagram}
                placeholder="@instagram"
                onChange={handleChange}
                className="w-full bg-black border border-zinc-700 rounded-lg py-3 px-4 text-white focus:border-[#C9A66B] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest border-b border-zinc-800 pb-2">
            Perfil Profissional
          </p>
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
            <div className="relative">
              <Clock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                required
                name="experience"
                type="text"
                value={formData.experience}
                placeholder="Tempo de Profissão (ex: 5 anos)"
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-xs text-gray-500 mb-2">Possui Agenda Online?</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="has_schedule"
                    checked={formData.has_schedule === "sim"}
                    onChange={() => setOption("has_schedule", "sim")}
                    className="accent-[#C9A66B]"
                  />
                  <span className="text-sm text-white">Sim</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="has_schedule"
                    checked={formData.has_schedule === "nao"}
                    onChange={() => setOption("has_schedule", "nao")}
                    className="accent-[#C9A66B]"
                  />
                  <span className="text-sm text-white">Não</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest border-b border-zinc-800 pb-2">
            Endereço
          </p>

          <div className="flex gap-2 items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                required
                name="zip_code"
                value={formData.zip_code}
                type="text"
                inputMode="numeric"
                placeholder="CEP (somente números)"
                onChange={handleChange}
                onBlur={() => void buscarCep()}
                className={inputClass}
              />
            </div>
            {buscandoCep ? <Loader2 className="animate-spin text-[#C9A66B] shrink-0" size={20} /> : null}
          </div>
          {cepMsg && <p className="text-[11px] text-amber-400/90">{cepMsg}</p>}

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2 relative">
              <MapPin className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                required
                name="address"
                value={formData.address}
                type="text"
                placeholder="Rua / Avenida"
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="relative col-span-1">
              <Home className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                required
                name="number"
                value={formData.number}
                type="text"
                placeholder="Nº"
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="relative col-span-1">
              <Building className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                name="complement"
                value={formData.complement}
                type="text"
                placeholder="Comp."
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              required
              name="neighborhood"
              value={formData.neighborhood}
              type="text"
              placeholder="Bairro"
              onChange={handleChange}
              className="w-full bg-black border border-zinc-700 rounded-lg py-3 px-4 text-white focus:border-[#C9A66B] outline-none"
            />
            <div className="flex gap-2">
              <input
                required
                name="city"
                value={formData.city}
                type="text"
                placeholder="Cidade"
                onChange={handleChange}
                className="w-full bg-black border border-zinc-700 rounded-lg py-3 px-4 text-white focus:border-[#C9A66B] outline-none"
              />
              <input
                required
                name="state"
                value={formData.state}
                type="text"
                maxLength={2}
                placeholder="UF"
                onChange={handleChange}
                className="w-16 bg-black border border-zinc-700 rounded-lg py-3 px-2 text-white text-center focus:border-[#C9A66B] outline-none"
              />
            </div>
          </div>
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold py-4 rounded-lg uppercase tracking-widest transition-all mt-6 flex items-center justify-center gap-2 shadow-lg shadow-[#C9A66B]/20 disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" /> : "FINALIZAR CADASTRO"}
        </button>
      </form>

      <p className="text-center text-gray-500 text-sm mt-6">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-[#C9A66B] hover:underline">
          Faça Login
        </Link>
      </p>
    </div>
  );
}

function CadastroShell({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
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
