"use client";
import { useEffect, useState, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  Calendar, Plus, Clock, Scissors, X, Check,
  ChevronLeft, ChevronRight, Loader2, Settings, Link2, Copy,
  CheckCircle, XCircle, AlertCircle, Trash2, MessageCircle,
} from "lucide-react";

type Appointment = {
  id: string; client_name: string; client_phone: string | null;
  service: string | null; appointment_date: string; appointment_time: string;
  duration_min: number; price: number | null; status: string; notes: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; cor: string; icon: any }> = {
  pendente:   { label: "Pendente",   cor: "bg-yellow-900/30 text-yellow-400 border-yellow-800/40", icon: AlertCircle },
  confirmado: { label: "Confirmado", cor: "bg-blue-900/30 text-blue-400 border-blue-800/40",       icon: CheckCircle },
  concluido:  { label: "Concluído",  cor: "bg-green-900/30 text-green-400 border-green-800/40",    icon: CheckCircle },
  cancelado:  { label: "Cancelado",  cor: "bg-red-900/30 text-red-400 border-red-800/40",          icon: XCircle },
};

const DIAS_COMPLETO = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

function getMesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatarData(d: string) {
  const [y, m, dia] = d.split("-");
  return `${dia}/${m}/${y}`;
}

function gerarLinkWhats(phone: string, nome: string, data: string, hora: string, servico?: string | null, profNome?: string) {
  const tel = phone.replace(/\D/g, "");
  const fone = tel.startsWith("55") ? tel : `55${tel}`;
  const [y, m, dia] = data.split("-");
  const dataFmt = `${dia}/${m}/${y}`;
  const srv = servico ? ` (${servico})` : "";
  const pro = profNome ? `\n\n${profNome}` : "";
  const msg = encodeURIComponent(
    `Olá, ${nome}! 😊\n\nSeu agendamento${srv} foi confirmado para *${dataFmt}* às *${hora.slice(0,5)}*.${pro}\n\nTe aguardo! ✂️`
  );
  return `https://wa.me/${fone}?text=${msg}`;
}

const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]";
const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1";

export default function AgendaPage() {
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState("");
  const [profNome, setProfNome] = useState("");
  const [aba, setAba] = useState<"agenda" | "config">("agenda");
  const [mes, setMes] = useState(getMesAtual());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [avisoSQL, setAvisoSQL] = useState("");
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Novo/editar agendamento
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvoId, setSalvoId] = useState<string | null>(null); // ID do recém-criado para o botão WhatsApp
  const [salvoInfo, setSalvoInfo] = useState<any>(null);
  const [erroForm, setErroForm] = useState("");
  const [editando, setEditando] = useState<Appointment | null>(null);
  const [form, setForm] = useState({
    client_name: "", client_phone: "", service: "",
    appointment_date: "", appointment_time: "",
    duration_min: "60", price: "", notes: "",
  });

  // Disponibilidade
  const [disponibilidade, setDisponibilidade] = useState<any[]>([]);
  const [salvandoDisp, setSalvandoDisp] = useState(false);
  const [erroDisp, setErroDisp] = useState("");
  const [okDisp, setOkDisp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        supabase.from("profiles").select("full_name").eq("id", session.user.id).single()
          .then(({ data }) => { if (data) setProfNome(data.full_name); });
      }
    });
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agenda?mes=${mes}`);
    const d = await res.json();
    setAppointments(d.appointments || []);
    setLoading(false);
  }, [mes]);

  const carregarDisp = useCallback(async () => {
    const res = await fetch("/api/agenda/disponibilidade");
    const d = await res.json();
    if (d.ok) setDisponibilidade(d.disponibilidade || []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { if (aba === "config") carregarDisp(); }, [aba, carregarDisp]);

  function mudarMes(delta: number) {
    const [y, m] = mes.split("-").map(Number);
    const nova = new Date(y, m - 1 + delta);
    setMes(`${nova.getFullYear()}-${String(nova.getMonth() + 1).padStart(2, "0")}`);
  }

  const nomeMes = new Date(`${mes}-15`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  async function salvar() {
    if (!form.client_name || !form.appointment_date || !form.appointment_time) return;
    setSalvando(true); setErroForm("");
    const method = editando ? "PATCH" : "POST";
    const body = editando ? { id: editando.id, ...form } : form;
    const res = await fetch("/api/agenda", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json();
    if (d.ok) {
      if (!editando && d.appointment) {
        // Mostra botão de WhatsApp após criar
        setSalvoInfo({ ...d.appointment, ...form });
        setSalvoId(d.appointment.id);
      } else {
        setShowForm(false);
        setEditando(null);
      }
      resetForm();
      await carregar();
    } else {
      setErroForm(d.error || "Erro ao salvar. Verifique as permissões no Supabase.");
    }
    setSalvando(false);
  }

  function resetForm() {
    setForm({ client_name: "", client_phone: "", service: "", appointment_date: "", appointment_time: "", duration_min: "60", price: "", notes: "" });
  }

  function fecharForm() {
    setShowForm(false); setEditando(null); setSalvoId(null); setSalvoInfo(null); setErroForm(""); resetForm();
  }

  async function mudarStatus(id: string, status: string) {
    await fetch("/api/agenda", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este agendamento?")) return;
    await fetch("/api/agenda", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await carregar();
  }

  function abrirEditar(a: Appointment) {
    setEditando(a); setSalvoId(null); setSalvoInfo(null); setErroForm("");
    setForm({
      client_name: a.client_name, client_phone: a.client_phone || "",
      service: a.service || "", appointment_date: a.appointment_date,
      appointment_time: a.appointment_time.slice(0, 5),
      duration_min: String(a.duration_min), price: a.price ? String(a.price) : "",
      notes: a.notes || "",
    });
    setShowForm(true);
  }

  // Disponibilidade
  function getDia(dow: number) { return disponibilidade.find(d => d.day_of_week === dow); }
  function toggleDia(dow: number) {
    const existe = getDia(dow);
    if (existe) setDisponibilidade(prev => prev.filter(d => d.day_of_week !== dow));
    else setDisponibilidade(prev => [...prev, { day_of_week: dow, start_time: "09:00", end_time: "18:00", slot_duration_min: 60, active: true }]);
  }
  function setDiaField(dow: number, field: string, value: any) {
    setDisponibilidade(prev => prev.map(d => d.day_of_week === dow ? { ...d, [field]: value } : d));
  }
  async function salvarDisp() {
    setSalvandoDisp(true); setErroDisp(""); setOkDisp(false);
    const res = await fetch("/api/agenda/disponibilidade", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dias: disponibilidade }),
    });
    const d = await res.json();
    if (d.ok) { setOkDisp(true); setTimeout(() => setOkDisp(false), 3000); }
    else setErroDisp(d.error || "Erro ao salvar. Verifique as permissões no Supabase.");
    setSalvandoDisp(false);
  }

  function copiarLink() {
    const link = `${window.location.origin}/agendar/${userId}`;
    navigator.clipboard.writeText(link);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const porData = appointments.reduce((acc: Record<string, Appointment[]>, a) => {
    if (!acc[a.appointment_date]) acc[a.appointment_date] = [];
    acc[a.appointment_date].push(a);
    return acc;
  }, {});

  const pendentes = appointments.filter(a => a.status === "pendente").length;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-28">
      <div className="max-w-3xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/20 flex items-center justify-center">
              <Calendar className="text-[#C9A66B]" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Minha <span className="text-[#C9A66B]">Agenda</span></h1>
              <p className="text-xs text-zinc-500">
                {appointments.length} agendamento(s)
                {pendentes > 0 && <span className="text-yellow-400 font-bold ml-1">· {pendentes} pendente(s)</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAba(aba === "agenda" ? "config" : "agenda")}
              className={`p-2.5 rounded-xl border transition-all ${aba === "config" ? "bg-[#C9A66B]/20 border-[#C9A66B]/40 text-[#C9A66B]" : "bg-zinc-900 border-zinc-800 text-zinc-400"}`}>
              <Settings size={18} />
            </button>
            {aba === "agenda" && (
              <button onClick={() => { fecharForm(); setShowForm(true); }}
                className="flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black text-xs uppercase px-4 py-2.5 rounded-xl">
                <Plus size={16} /> Novo
              </button>
            )}
          </div>
        </div>

        {/* LINK DE AGENDAMENTO */}
        {userId && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
            <Link2 size={14} className="text-[#C9A66B] shrink-0" />
            <p className="text-xs text-zinc-400 flex-1 truncate font-mono">{typeof window !== "undefined" ? window.location.origin : ""}/agendar/{userId}</p>
            <button onClick={copiarLink}
              className="shrink-0 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg bg-[#C9A66B]/10 border border-[#C9A66B]/30 text-[#C9A66B] hover:bg-[#C9A66B]/20 flex items-center gap-1">
              <Copy size={11} /> {linkCopiado ? "Copiado!" : "Copiar link"}
            </button>
          </div>
        )}

        {/* AVISO SQL */}
        {avisoSQL && (
          <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-800/30 rounded-xl px-4 py-3 mb-4 text-yellow-400 text-xs font-bold">
            <AlertCircle size={14} className="shrink-0" /> {avisoSQL}
          </div>
        )}

        {/* ABA: AGENDA */}
        {aba === "agenda" && (
          <>
            <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-2xl px-5 py-3 mb-5">
              <button onClick={() => mudarMes(-1)} className="p-1 hover:text-[#C9A66B] transition-colors"><ChevronLeft size={20} /></button>
              <p className="font-black uppercase text-sm tracking-wider capitalize">{nomeMes}</p>
              <button onClick={() => mudarMes(1)} className="p-1 hover:text-[#C9A66B] transition-colors"><ChevronRight size={20} /></button>
            </div>

            {loading ? (
              <div className="flex justify-center mt-16"><Loader2 className="animate-spin text-[#C9A66B]" size={32} /></div>
            ) : Object.keys(porData).length === 0 ? (
              <div className="text-center mt-16 text-zinc-600">
                <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold uppercase text-sm">Nenhum agendamento neste mês</p>
                <p className="text-xs mt-1">Clique em "+ Novo" para adicionar</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(porData).map(([data, lista]) => {
                  const dataObj = new Date(`${data}T12:00:00`);
                  const diaSemana = DIAS_COMPLETO[dataObj.getDay()];
                  return (
                    <div key={data}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#C9A66B]/10 flex items-center justify-center">
                          <span className="text-[#C9A66B] font-black text-xs">{data.split("-")[2]}</span>
                        </div>
                        <p className="text-[11px] font-black uppercase text-zinc-500 tracking-widest">{diaSemana} · {formatarData(data)}</p>
                      </div>
                      <div className="space-y-2 pl-10">
                        {lista.map(a => {
                          const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pendente;
                          const Icon = cfg.icon;
                          return (
                            <div key={a.id} className={`bg-zinc-900/60 border rounded-2xl p-4 ${a.status === "cancelado" ? "opacity-50 border-zinc-900" : "border-zinc-800"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-black text-sm">{a.client_name}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.cor}`}>
                                      <Icon size={9} /> {cfg.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                                    <span className="flex items-center gap-1"><Clock size={11} /> {a.appointment_time.slice(0, 5)}</span>
                                    {a.service && <span className="flex items-center gap-1"><Scissors size={11} /> {a.service}</span>}
                                    {a.price && <span className="font-bold text-[#C9A66B]">R$ {Number(a.price).toFixed(2)}</span>}
                                  </div>
                                  {a.client_phone && (
                                    <p className="text-[11px] text-zinc-600 mt-1">{a.client_phone}</p>
                                  )}
                                  {a.notes && <p className="text-xs text-zinc-600 mt-1 italic">"{a.notes}"</p>}
                                </div>
                                <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                                  {/* WHATSAPP */}
                                  {a.client_phone && (
                                    <a href={gerarLinkWhats(a.client_phone, a.client_name, a.appointment_date, a.appointment_time, a.service, profNome)}
                                      target="_blank" rel="noopener noreferrer" title="Avisar pelo WhatsApp"
                                      className="p-1.5 rounded-lg bg-green-900/20 border border-green-800/30 text-green-400 hover:bg-green-900/40">
                                      <MessageCircle size={13} />
                                    </a>
                                  )}
                                  {a.status === "pendente" && (
                                    <button onClick={() => mudarStatus(a.id, "confirmado")} title="Confirmar"
                                      className="p-1.5 rounded-lg bg-blue-900/20 border border-blue-800/30 text-blue-400 hover:bg-blue-900/40">
                                      <Check size={13} />
                                    </button>
                                  )}
                                  {(a.status === "confirmado" || a.status === "pendente") && (
                                    <button onClick={() => mudarStatus(a.id, "concluido")} title="Concluir"
                                      className="p-1.5 rounded-lg bg-green-900/20 border border-green-800/30 text-green-400 hover:bg-green-900/40">
                                      <CheckCircle size={13} />
                                    </button>
                                  )}
                                  <button onClick={() => abrirEditar(a)} title="Editar"
                                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-[#C9A66B] hover:bg-zinc-700">
                                    <Settings size={13} />
                                  </button>
                                  <button onClick={() => excluir(a.id)} title="Excluir"
                                    className="p-1.5 rounded-lg bg-red-900/20 border border-red-800/30 text-red-400 hover:bg-red-900/40">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ABA: CONFIG DISPONIBILIDADE */}
        {aba === "config" && (
          <div>
            <p className="text-xs text-zinc-500 mb-4">Configure os dias e horários que você atende. Seus clientes só poderão agendar dentro desses horários.</p>
            <div className="space-y-3">
              {[1,2,3,4,5,6,0].map(dow => {
                const dia = getDia(dow);
                const ativo = !!dia;
                return (
                  <div key={dow} className={`bg-zinc-900/60 border rounded-2xl p-4 transition-all ${ativo ? "border-zinc-700" : "border-zinc-900 opacity-50"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleDia(dow)}
                          className={`w-10 h-6 rounded-full transition-all relative ${ativo ? "bg-[#C9A66B]" : "bg-zinc-800"}`}>
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${ativo ? "left-5" : "left-1"}`} />
                        </button>
                        <p className="font-black text-sm uppercase">{DIAS_COMPLETO[dow]}</p>
                      </div>
                      {ativo && <span className="text-[10px] text-zinc-500">{dia.start_time?.slice(0,5)} – {dia.end_time?.slice(0,5)}</span>}
                    </div>
                    {ativo && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={labelClass}>Início</label>
                          <input type="time" value={dia.start_time?.slice(0,5) || "09:00"}
                            onChange={e => setDiaField(dow, "start_time", e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Fim</label>
                          <input type="time" value={dia.end_time?.slice(0,5) || "18:00"}
                            onChange={e => setDiaField(dow, "end_time", e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Duração (min)</label>
                          <select value={dia.slot_duration_min || 60}
                            onChange={e => setDiaField(dow, "slot_duration_min", Number(e.target.value))} className={inputClass}>
                            {[30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {erroDisp && (
              <div className="mt-4 flex items-center gap-2 bg-red-900/20 border border-red-800/30 rounded-xl px-4 py-3 text-red-400 text-xs font-bold">
                <AlertCircle size={14} /> {erroDisp}
              </div>
            )}
            {okDisp && (
              <div className="mt-4 flex items-center gap-2 bg-green-900/20 border border-green-800/30 rounded-xl px-4 py-3 text-green-400 text-xs font-bold">
                <CheckCircle size={14} /> Disponibilidade salva com sucesso!
              </div>
            )}
            <button onClick={salvarDisp} disabled={salvandoDisp}
              className="w-full mt-4 bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2">
              {salvandoDisp ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {salvandoDisp ? "Salvando..." : "Salvar Disponibilidade"}
            </button>
          </div>
        )}
      </div>

      {/* MODAL NOVO/EDITAR */}
      {showForm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <h2 className="font-black uppercase text-sm">{editando ? "Editar" : salvoId ? "Agendado!" : "Novo Agendamento"}</h2>
              <button onClick={fecharForm}><X size={20} className="text-zinc-500" /></button>
            </div>
            <div className="p-6 space-y-3">

              {/* APÓS CRIAR — mostra confirmação + botão WhatsApp */}
              {salvoId && salvoInfo && (
                <div className="space-y-3">
                  <div className="bg-green-900/20 border border-green-800/30 rounded-xl px-4 py-3 flex items-center gap-2 text-green-400 text-sm font-bold">
                    <CheckCircle size={16} /> Agendamento criado com sucesso!
                  </div>
                  <div className="bg-zinc-900 rounded-xl px-4 py-3 text-sm text-zinc-300 space-y-1">
                    <p><span className="text-zinc-500 text-xs">Cliente:</span> <strong>{salvoInfo.client_name}</strong></p>
                    <p><span className="text-zinc-500 text-xs">Data:</span> <strong>{formatarData(salvoInfo.appointment_date)}</strong></p>
                    <p><span className="text-zinc-500 text-xs">Horário:</span> <strong>{salvoInfo.appointment_time?.slice(0,5)}</strong></p>
                    {salvoInfo.service && <p><span className="text-zinc-500 text-xs">Serviço:</span> {salvoInfo.service}</p>}
                  </div>
                  {salvoInfo.client_phone && (
                    <a href={gerarLinkWhats(salvoInfo.client_phone, salvoInfo.client_name, salvoInfo.appointment_date, salvoInfo.appointment_time, salvoInfo.service, profNome)}
                      target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl transition-all">
                      <MessageCircle size={16} /> Avisar Cliente pelo WhatsApp
                    </a>
                  )}
                  <button onClick={fecharForm}
                    className="w-full py-2.5 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs uppercase hover:bg-zinc-700 transition-all">
                    Fechar
                  </button>
                </div>
              )}

              {/* FORMULÁRIO */}
              {!salvoId && (
                <>
                  <div><label className={labelClass}>Nome do Cliente *</label><input value={form.client_name} onChange={e => set("client_name", e.target.value)} className={inputClass} placeholder="Ex: João Silva" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelClass}>Data *</label><input type="date" value={form.appointment_date} onChange={e => set("appointment_date", e.target.value)} className={inputClass} style={{ colorScheme: "dark" }} min={new Date().toISOString().split("T")[0]} /></div>
                    <div><label className={labelClass}>Horário *</label><input type="time" value={form.appointment_time} onChange={e => set("appointment_time", e.target.value)} className={inputClass} /></div>
                  </div>
                  <div><label className={labelClass}>Serviço</label><input value={form.service} onChange={e => set("service", e.target.value)} className={inputClass} placeholder="Ex: Corte + Barba" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelClass}>WhatsApp</label><input value={form.client_phone} onChange={e => set("client_phone", e.target.value)} className={inputClass} placeholder="11999999999" /></div>
                    <div><label className={labelClass}>Valor (R$)</label><input type="number" value={form.price} onChange={e => set("price", e.target.value)} className={inputClass} placeholder="0,00" /></div>
                  </div>
                  <div>
                    <label className={labelClass}>Duração</label>
                    <select value={form.duration_min} onChange={e => set("duration_min", e.target.value)} className={inputClass}>
                      {[30,45,60,90,120].map(m => <option key={m} value={m}>{m} minutos</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Observações</label><textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} className={`${inputClass} resize-none`} /></div>
                  {erroForm && (
                    <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/30 rounded-xl px-3 py-2.5 text-red-400 text-xs font-bold">
                      <AlertCircle size={13} /> {erroForm}
                    </div>
                  )}
                  <button onClick={salvar} disabled={salvando || !form.client_name || !form.appointment_date || !form.appointment_time}
                    className="w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs py-3 rounded-xl flex items-center justify-center gap-2">
                    {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {salvando ? "Salvando..." : editando ? "Salvar Alterações" : "Agendar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




