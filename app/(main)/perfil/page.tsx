"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState, useRef } from "react";
import { User, MapPin, Briefcase, Scissors, Edit, ShieldCheck, Phone, Home, Save, X, Loader2 } from "lucide-react";

export default function PerfilPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  
  // Estados do formulário
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [cityState, setCityState] = useState("");
  const [number, setNumber] = useState("");
  
  const numberInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        setProfile(data);
        
        // Preenche os campos com dados existentes
        if (data) {
          setPhone(data.phone || "");
          setCep(data.cep || "");
          setAddress(data.rua || "");
          setNeighborhood(data.bairro || "");
          setCityState(data.city_state || "");
          setNumber(data.number || "");
        }
      }
      setLoading(false);
    }
    getData();
  }, [supabase]);

  // Função para aplicar máscara de CEP
  const maskCEP = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  // Função para aplicar máscara de WhatsApp
  const maskPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Função para buscar CEP via ViaCEP
  const fetchCEP = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    
    if (cleanCep.length !== 8) return;
    
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setAddress(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCityState(`${data.localidade}/${data.uf}`);
        
        // Move o foco para o campo número
        setTimeout(() => {
          numberInputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setLoadingCep(false);
    }
  };

  // Handler para mudança de CEP
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCEP(e.target.value);
    setCep(masked);
  };

  // Handler para blur do CEP (busca automática)
  const handleCepBlur = () => {
    if (cep.replace(/\D/g, "").length === 8) {
      fetchCEP(cep);
    }
  };

  // Handler para mudança de telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskPhone(e.target.value);
    setPhone(masked);
  };

  // Função para salvar os dados
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Sessão não encontrada");
      }

      const updates: any = {
        phone: phone,
        cep: cep,
        rua: address,
        bairro: neighborhood,
        city_state: cityState,
        number: number,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", session.user.id);

      if (error) throw error;

      // Atualiza o perfil local
      setProfile({ ...profile, ...updates });
      setEditing(false);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar dados. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Função para cancelar edição
  const handleCancel = () => {
    // Restaura os valores originais
    if (profile) {
      setPhone(profile.phone || "");
      setCep(profile.cep || "");
      setAddress(profile.rua || "");
      setNeighborhood(profile.bairro || "");
      setCityState(profile.city_state || "");
      setNumber(profile.number || "");
    }
    setEditing(false);
  };

  if (loading) return <div className="p-12 text-slate-500">Carregando perfil...</div>;

  const isDistribuidor = profile?.role === 'distribuidor';
  
  // Lógica inteligente para o endereço
  const enderecoCompleto = [profile?.city, profile?.state].filter(Boolean).join(" - ");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic">MEU <span className="text-[#C9A66B]">PERFIL</span></h1>
            <p className="text-slate-400">Gerencie seus dados e status profissional.</p>
        </div>
        {!editing && (
          <button 
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            <Edit size={14} /> Editar Dados
          </button>
        )}
      </div>

      {/* CARD PRINCIPAL */}
      <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-[#C9A66B]/5 blur-3xl rounded-full pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              
              {/* AVATAR */}
              <div className="relative group">
                  <div className="w-32 h-32 rounded-full border-4 border-[#C9A66B]/20 bg-black flex items-center justify-center relative overflow-hidden">
                      <User size={48} className="text-slate-500" />
                  </div>
                  <div className="absolute bottom-0 right-0 bg-[#C9A66B] p-2 rounded-full text-black border-4 border-[#0A0A0A]">
                      <Edit size={14} />
                  </div>
              </div>

              {/* DADOS */}
              <div className="text-center md:text-left space-y-2">
                  
                  {/* SÓ MOSTRA ETIQUETA SE TIVER NÍVEL NO BANCO */}
                  {profile?.current_level && (
                    <div className="inline-flex items-center gap-1 bg-[#C9A66B]/10 border border-[#C9A66B]/20 px-3 py-1 rounded-full text-[#C9A66B] text-[10px] font-black uppercase tracking-widest mb-1">
                        <ShieldCheck size={10} />
                        {profile.current_level}
                    </div>
                  )}

                  <h2 className="text-4xl font-black text-white tracking-tighter">
                      {profile?.full_name || "Usuário"}
                  </h2>

                  <div className="flex items-center justify-center md:justify-start gap-2 text-slate-400 font-medium">
                      {isDistribuidor ? <Briefcase size={16} className="text-[#C9A66B]"/> : <Scissors size={16} className="text-slate-400"/>}
                      <span>
                          {isDistribuidor ? "Distribuidor Autorizado" : "Cabeleireiro Profissional"}
                      </span>
                  </div>

                  <div className="pt-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saldo Atual</p>
                      <p className="text-2xl font-black text-white">{profile?.pro_balance || 0} PRO</p>
                  </div>
              </div>
          </div>
      </div>

      {/* FORMULÁRIO DE EDIÇÃO */}
      {editing ? (
        <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-2xl space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-white tracking-tighter">Editar Dados de Contato e Endereço</h2>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                <X size={14} /> Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-[#C9A66B] hover:bg-[#C9A66B]/90 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WhatsApp */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
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
                  value={cep}
                  onChange={handleCepChange}
                  onBlur={handleCepBlur}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                  placeholder="00000-000"
                  maxLength={9}
                />
                {loadingCep && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="animate-spin text-[#C9A66B]" />
                  </div>
                )}
              </div>
            </div>

            {/* Endereço (Rua) */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Endereço (Rua)</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <Home size={18} />
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                  placeholder="Nome da rua"
                />
              </div>
            </div>

            {/* Número e Bairro lado a lado */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Número</label>
              <div className="relative">
                <input
                  ref={numberInputRef}
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-4 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                  placeholder="123"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Bairro</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <MapPin size={18} />
                </div>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                  placeholder="Nome do bairro"
                />
              </div>
            </div>

            {/* Cidade/Estado */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cidade/Estado</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <MapPin size={18} />
                </div>
                <input
                  type="text"
                  value={cityState}
                  onChange={(e) => setCityState(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all"
                  placeholder="Ex: São Paulo/SP"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* GRID INFERIOR - VISUALIZAÇÃO */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CARD DE CONTATO */}
          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-2xl">
              <h3 className="text-[#C9A66B] font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Briefcase size={14} /> Detalhes Profissionais
              </h3>
              
              <div className="space-y-4">
                  <div className="flex justify-between border-b border-white/5 pb-3">
                      <span className="text-slate-500 text-sm">Função</span>
                      <span className="text-white font-bold text-sm capitalize">{profile?.role || "-"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-3">
                      <span className="text-slate-500 text-sm">Instagram</span>
                      <span className="text-white font-bold text-sm">{profile?.instagram || "-"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-3">
                      <span className="text-slate-500 text-sm">WhatsApp</span>
                      <span className="text-white font-bold text-sm">{profile?.phone || "-"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-3">
                      <span className="text-slate-500 text-sm">CPF</span>
                      <span className="text-white font-bold text-sm">{profile?.cpf || "-"}</span>
                  </div>
              </div>
          </div>

          {/* CARD DE LOCALIZAÇÃO */}
          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-2xl">
              <h3 className="text-[#C9A66B] font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
                  <MapPin size={14} /> Localização
              </h3>
              
              {(profile?.rua || profile?.city_state || enderecoCompleto) ? (
                  <div className="space-y-4 animate-in fade-in">
                      {profile?.rua && (
                        <div className="flex justify-between border-b border-white/5 pb-3">
                          <span className="text-slate-500 text-sm">Endereço</span>
                          <span className="text-white text-sm">{profile.rua} {profile.number ? `, ${profile.number}` : ""}</span>
                        </div>
                      )}
                      {profile?.bairro && (
                        <div className="flex justify-between border-b border-white/5 pb-3">
                          <span className="text-slate-500 text-sm">Bairro</span>
                          <span className="text-white text-sm">{profile.bairro}</span>
                        </div>
                      )}
                      {profile?.cep && (
                        <div className="flex justify-between border-b border-white/5 pb-3">
                          <span className="text-slate-500 text-sm">CEP</span>
                          <span className="text-white text-sm">{profile.cep}</span>
                        </div>
                      )}
                      {profile?.city_state && (
                        <div className="flex justify-between border-b border-white/5 pb-3">
                          <span className="text-slate-500 text-sm">Cidade/Estado</span>
                          <span className="text-white text-sm">{profile.city_state}</span>
                        </div>
                      )}
                      {enderecoCompleto && !profile?.city_state && (
                        <>
                          <div className="flex justify-between border-b border-white/5 pb-3">
                            <span className="text-slate-500 text-sm">Cidade</span>
                            <span className="text-white text-sm">{profile?.city}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-3">
                            <span className="text-slate-500 text-sm">Estado</span>
                            <span className="text-white text-sm">{profile?.state}</span>
                          </div>
                        </>
                      )}
                  </div>
              ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-center text-slate-600 border border-dashed border-white/10 rounded-xl bg-white/5">
                      <p className="text-sm font-medium">Endereço não cadastrado</p>
                      <button 
                        onClick={() => setEditing(true)}
                        className="text-xs text-[#C9A66B] font-bold mt-2 hover:underline"
                      >
                          Adicionar Endereço
                      </button>
                  </div>
              )}
          </div>

        </div>
      )}
    </div>
  );
}