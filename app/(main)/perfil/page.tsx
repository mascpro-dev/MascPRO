"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  ShieldCheck, LayoutDashboard, User, Camera, Save,
  Instagram, Phone, MapPin, Briefcase, Clock, Loader2, CheckCircle, AlertCircle, Link2,
} from "lucide-react";
import { slugifyForBooking } from "@/lib/bookingSlug";

type Form = {
  full_name: string;
  whatsapp: string;
  instagram: string;
  bio: string;
  city: string;
  state: string;
  barber_shop: string;
  booking_slug: string;
  work_type: string;
  experience: string;
};

const WORK_TYPES = ["Salão Próprio", "Alugo Cadeira", "Comissionado"];
const EXPERIENCE_OPTIONS = [
  { value: "menos de 1 ano", label: "Iniciante (menos de 1 ano)" },
  { value: "1 a 5 anos", label: "1 a 5 anos" },
  { value: "mais de 5 anos", label: "Mais de 5 anos" },
];

export default function PerfilPage() {
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<Form>({
    full_name: "", whatsapp: "", instagram: "", bio: "",
    city: "", state: "", barber_shop: "", booking_slug: "", work_type: "", experience: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [alterandoFoto, setAlterandoFoto] = useState(false);
  const [feedbackFoto, setFeedbackFoto] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("*, moedas_pro_acumuladas, personal_coins, network_coins")
        .eq("id", session.user.id)
        .single();
      if (data) {
        setProfile(data);
        setForm({
          full_name: data.full_name || "",
          whatsapp: data.whatsapp || "",
          instagram: data.instagram || "",
          bio: data.bio || "",
          city: data.city || "",
          state: data.state || "",
          barber_shop: data.barber_shop || "",
          booking_slug: data.booking_slug || "",
          work_type: data.work_type || "",
          experience: data.experience || "",
        });
      }
    }
    load();
  }, []);

  const set = (field: keyof Form, val: string) =>
    setForm(f => ({ ...f, [field]: val }));

  async function uploadAvatar(file: File) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setFeedback({ tipo: "erro", msg: "Faça login novamente." });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    if (!/^(jpe?g|png|webp|gif)$/.test(ext)) {
      setFeedback({ tipo: "erro", msg: "Use JPG, PNG, WebP ou GIF." });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ tipo: "erro", msg: "Imagem até 5 MB." });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }
    const path = `profile-avatars/${session.user.id}/${Date.now()}.${ext}`;
    setAlterandoFoto(true);
    setFeedback(null);
    try {
      const { error: upErr } = await supabase.storage
        .from("community-media")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const publicUrl = supabase.storage.from("community-media").getPublicUrl(path).data.publicUrl;
      const res = await fetch("/api/perfil/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Erro ao salvar foto.");
      setProfile((p: any) => ({ ...p, avatar_url: publicUrl }));
      setFeedback({ tipo: "ok", msg: "Foto atualizada!" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Não foi possível enviar a foto.";
      setFeedback({ tipo: "erro", msg });
    } finally {
      setAlterandoFoto(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  async function salvar() {
    setSalvando(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/perfil/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setFeedback({ tipo: "ok", msg: "Perfil atualizado com sucesso!" });
        setProfile((p: any) => ({ ...p, ...form }));
      } else {
        setFeedback({ tipo: "erro", msg: data?.error || "Erro ao salvar." });
      }
    } catch {
      setFeedback({ tipo: "erro", msg: "Falha de rede. Tente novamente." });
    } finally {
      setSalvando(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[#C9A66B] transition-colors";

  return (
    <div className="p-4 md:p-8 min-h-screen bg-black text-white pb-24">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* COLUNA DA ESQUERDA */}
        <div className="space-y-4">
          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 text-center flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full bg-zinc-800 border-2 border-[#C9A66B] overflow-hidden flex items-center justify-center">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                : <User size={48} className="text-zinc-600" />
              }
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void uploadAvatar(f);
              }}
            />
            <button
              type="button"
              disabled={alterandoFoto}
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] font-black uppercase text-[#C9A66B] flex items-center gap-1 hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {alterandoFoto ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              {alterandoFoto ? "Enviando..." : "Alterar Foto"}
            </button>
            {profile?.role && (
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-800 rounded-full px-3 py-1">
                {profile.role}
              </span>
            )}
          </div>

          <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-[#C9A66B] w-4 h-4" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dica MASC PRO</p>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Mantenha seu perfil atualizado. Isso ajuda no networking e na visibilidade dentro da comunidade.
            </p>
          </div>

          {/* Moedas acumuladas */}
          {profile && (
            <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Seu Saldo PRO</p>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Rumo ao Profissional</span>
                  <span className="text-sm font-black text-[#C9A66B]">
                    {(Number(profile.moedas_pro_acumuladas || 0) + Number(profile.personal_coins || 0)).toLocaleString("pt-BR")} PRO
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Mérito de Rede</span>
                  <span className="text-sm font-black text-white">{profile.network_coins || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Mérito Técnico</span>
                  <span className="text-sm font-black text-white">{profile.personal_coins || 0}</span>
                </div>
              </div>
            </div>
          )}

          {profile?.role === "ADMIN" && (
            <button
              onClick={() => window.location.href = "/admin"}
              className="w-full flex items-center justify-center gap-3 bg-[#C9A66B] text-black font-black uppercase italic py-5 rounded-2xl hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(201,166,107,0.2)]"
            >
              <LayoutDashboard size={20} /> Acessar Radar Admin
            </button>
          )}
        </div>

        {/* COLUNA DIREITA — FORMULÁRIO */}
        <div className="md:col-span-2">
          <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black italic uppercase">
                Identidade <span className="text-[#C9A66B]">PRO</span>
              </h3>
              <button
                onClick={salvar}
                disabled={salvando}
                className="bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {salvando ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>

            {/* FEEDBACK */}
            {feedback && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold mb-5 ${
                feedback.tipo === "ok"
                  ? "bg-green-500/10 border border-green-500/30 text-green-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
              }`}>
                {feedback.tipo === "ok" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {feedback.msg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <User size={11} /> Nome Completo
                </label>
                <input type="text" value={form.full_name} onChange={e => set("full_name", e.target.value)} className={inputClass} />
              </div>

              {/* Nome do salão (link público de agendamento) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nome do salão ou espaço</label>
                <input
                  type="text"
                  placeholder="Ex: Studio Cortes & Cia"
                  value={form.barber_shop}
                  onChange={e => set("barber_shop", e.target.value)}
                  className={inputClass}
                />
                <p className="text-[10px] text-zinc-600 leading-relaxed">
                  É o título que o cliente vê ao abrir seu link de agendamento. Se ficar em branco, usamos seu nome completo.
                </p>
              </div>

              {/* Link curto da agenda */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <Link2 size={11} /> Final do link de agendamento
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex items-center rounded-xl border border-white/10 bg-black/40 overflow-hidden min-w-0">
                    <span className="pl-3 text-[10px] text-zinc-500 shrink-0 hidden sm:inline">…/agendar/</span>
                    <input
                      type="text"
                      placeholder="ex: salao-joana"
                      value={form.booking_slug}
                      onChange={(e) => set("booking_slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      className="flex-1 min-w-0 bg-transparent border-0 py-3 px-3 sm:pl-1 text-sm text-white outline-none focus:ring-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const base = form.barber_shop.trim() || form.full_name.trim();
                      if (base) set("booking_slug", slugifyForBooking(base));
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B] border border-[#C9A66B]/40 rounded-xl px-4 py-2 hover:bg-[#C9A66B]/10 transition-colors whitespace-nowrap"
                  >
                    Sugerir do salão / nome
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 leading-relaxed">
                  Só letras minúsculas, números e hífen (acentos viram letras simples). Deixe em branco para usar só o ID longo no link.
                </p>
              </div>

              {/* Bio textarea */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bio (Sobre você)</label>
                <textarea
                  rows={3}
                  value={form.bio}
                  onChange={e => set("bio", e.target.value)}
                  placeholder="Fale um pouco sobre você..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Instagram */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <Instagram size={11} /> Instagram
                </label>
                <input type="text" placeholder="@seuinstagram" value={form.instagram} onChange={e => set("instagram", e.target.value)} className={inputClass} />
              </div>

              {/* WhatsApp */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <Phone size={11} /> WhatsApp
                </label>
                <input type="text" placeholder="(11) 99999-9999" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} className={inputClass} />
              </div>

              {/* Cidade */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <MapPin size={11} /> Cidade
                </label>
                <input type="text" placeholder="Ex: São Paulo" value={form.city} onChange={e => set("city", e.target.value)} className={inputClass} />
              </div>

              {/* Estado */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Estado (UF)</label>
                <input type="text" placeholder="Ex: SP" maxLength={2} value={form.state} onChange={e => set("state", e.target.value.toUpperCase())} className={inputClass} />
              </div>

              {/* Situação Profissional */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <Briefcase size={11} /> Situação Profissional
                </label>
                <div className="flex gap-2 flex-wrap">
                  {WORK_TYPES.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set("work_type", opt)}
                      className={`flex-1 py-2 px-2 text-[10px] font-black uppercase rounded-lg border transition-all ${
                        form.work_type === opt
                          ? "bg-[#C9A66B] text-black border-[#C9A66B]"
                          : "bg-black/40 text-zinc-500 border-white/10 hover:border-[#C9A66B]/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tempo de Profissão */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <Clock size={11} /> Tempo de Profissão
                </label>
                <select
                  value={form.experience}
                  onChange={e => set("experience", e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">Selecionar...</option>
                  {EXPERIENCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botão salvar inferior */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <button
                onClick={salvar}
                disabled={salvando}
                className="w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm"
              >
                {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {salvando ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
