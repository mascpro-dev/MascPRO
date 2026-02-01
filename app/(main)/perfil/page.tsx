"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, Save, User, MapPin, Instagram, Phone, Camera, AtSign, FileText } from "lucide-react";
import Link from "next/link";

export default function PerfilPage() {
  const supabase = createClientComponentClient();
  
  // Estados do Formulário
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    nickname: "",
    avatar_url: "",
    instagram: "",
    whatsapp: "",
    address: "",
    city: "",
    state: "",
    bio: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. CARREGAR DADOS AO ABRIR
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
          
          if (data) {
            setFormData({
                full_name: data.full_name || "",
                nickname: data.nickname || "",
                avatar_url: data.avatar_url || "",
                instagram: data.instagram || "",
                whatsapp: data.whatsapp || data.phone || "",
                address: data.address || data.rua || "",
                city: data.city || "",
                state: data.state || "",
                bio: data.bio || ""
            });
          }
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [supabase]);

  // 2. SALVAR ALTERAÇÕES
  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    
    try {
        const { error } = await supabase.from("profiles").update({
            full_name: formData.full_name,
            nickname: formData.nickname,
            instagram: formData.instagram,
            whatsapp: formData.whatsapp,
            phone: formData.whatsapp, // Mantém compatibilidade
            address: formData.address,
            city: formData.city,
            state: formData.state,
            bio: formData.bio,
            updated_at: new Date().toISOString()
        }).eq("id", userId);

        if (error) throw error;
        alert("✅ Perfil atualizado com sucesso!");

    } catch (error) {
        alert("Erro ao salvar perfil.");
        console.error(error);
    } finally {
        setSaving(false);
    }
  };

  // 3. UPLOAD DE FOTO (Mágica)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !userId) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
        // Upload para o Bucket 'avatars'
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
        if (uploadError) throw uploadError;

        // Pega URL pública
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

        // Atualiza estado e salva no banco imediatamente
        setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
        await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);

    } catch (error) {
        alert("Erro ao enviar foto.");
        console.error(error);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#C9A66B]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#000000] text-white p-4 md:p-8 pb-24 font-sans">
      
      <div className="max-w-4xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-8">
            <h1 className="text-3xl font-extrabold italic tracking-wide">
                MEU <span className="text-[#C9A66B]">PERFIL</span>
            </h1>
            <p className="text-gray-400 mt-2 text-sm">Gerencie sua identidade visual e dados de contato.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* --- COLUNA 1: FOTO E INFO BÁSICA --- */}
            <div className="space-y-6">
                
                {/* CARD FOTO */}
                <div className="bg-[#111] border border-[#222] rounded-xl p-6 flex flex-col items-center">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-32 h-32 rounded-full border-4 border-[#C9A66B] overflow-hidden bg-[#222]">
                            {formData.avatar_url ? (
                                <img src={formData.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl text-gray-500 font-bold">
                                    {formData.full_name?.substring(0,2).toUpperCase() || "EU"}
                                </div>
                            )}
                        </div>
                        {/* Overlay de Câmera */}
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white w-8 h-8" />
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-3 font-bold uppercase">Clique para alterar foto</p>
                </div>

                {/* DICAS */}
                <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                    <h3 className="text-[#C9A66B] font-bold text-sm mb-2 flex items-center gap-2">
                        <User size={16} /> Dica MASC PRO
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Mantenha seu perfil atualizado. Um perfil completo aumenta suas chances de networking na Comunidade.
                    </p>
                </div>

            </div>

            {/* --- COLUNA 2 E 3: FORMULÁRIO --- */}
            <div className="md:col-span-2 bg-[#111] border border-[#222] rounded-xl p-6 md:p-8">
                
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    
                    {/* SEÇÃO: IDENTIDADE */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-[#222] pb-2">Identidade</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 font-bold">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-gray-600" size={16} />
                                    <input 
                                        type="text" 
                                        value={formData.full_name} 
                                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#C9A66B] outline-none transition-colors"
                                        placeholder="Seu nome"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 font-bold">Apelido (Como quer ser chamado)</label>
                                <div className="relative">
                                    <AtSign className="absolute left-3 top-3 text-gray-600" size={16} />
                                    <input 
                                        type="text" 
                                        value={formData.nickname} 
                                        onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#C9A66B] outline-none transition-colors"
                                        placeholder="Ex: Jão"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs text-gray-400 font-bold">Bio (Sobre você)</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 text-gray-600" size={16} />
                                    <textarea 
                                        value={formData.bio} 
                                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#C9A66B] outline-none transition-colors min-h-[80px] resize-none"
                                        placeholder="Ex: Empreendedor, focado em dropshipping..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO: CONTATO */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-[#222] pb-2 mt-2">Redes & Contato</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 font-bold">Instagram (@usuario)</label>
                                <div className="relative">
                                    <Instagram className="absolute left-3 top-3 text-gray-600" size={16} />
                                    <input 
                                        type="text" 
                                        value={formData.instagram} 
                                        onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#C9A66B] outline-none transition-colors"
                                        placeholder="@seuinsta"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 font-bold">WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 text-gray-600" size={16} />
                                    <input 
                                        type="text" 
                                        value={formData.whatsapp} 
                                        onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#C9A66B] outline-none transition-colors"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO: ENDEREÇO */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-[#222] pb-2 mt-2">Localização</h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-6 space-y-1">
                                <label className="text-xs text-gray-400 font-bold">Endereço</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-gray-600" size={16} />
                                    <input 
                                        type="text" 
                                        value={formData.address} 
                                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#C9A66B] outline-none transition-colors"
                                        placeholder="Rua, Número, Bairro"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-4 space-y-1">
                                <label className="text-xs text-gray-400 font-bold">Cidade</label>
                                <input 
                                    type="text" 
                                    value={formData.city} 
                                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg py-2.5 px-4 text-sm text-white focus:border-[#C9A66B] outline-none transition-colors"
                                    placeholder="São Paulo"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs text-gray-400 font-bold">UF</label>
                                <input 
                                    type="text" 
                                    maxLength={2}
                                    value={formData.state} 
                                    onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
                                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg py-2.5 px-4 text-sm text-white focus:border-[#C9A66B] outline-none transition-colors text-center uppercase"
                                    placeholder="SP"
                                />
                            </div>
                        </div>
                    </div>

                    {/* BOTÃO SALVAR */}
                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit"
                            disabled={saving}
                            className="bg-[#C9A66B] text-black font-bold text-sm px-8 py-3 rounded-lg hover:bg-[#b08d55] flex items-center gap-2 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(201,166,107,0.3)] hover:shadow-[0_0_25px_rgba(201,166,107,0.5)]"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            SALVAR ALTERAÇÕES
                        </button>
                    </div>

                </form>

            </div>
        </div>
        
      </div>
    </div>
  );
}
