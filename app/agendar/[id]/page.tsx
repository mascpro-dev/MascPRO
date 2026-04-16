"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  Clock,
  Scissors,
  MapPin,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

const TEXTO_VALOR_PROCEDIMENTO_CLIENTE =
  "Investimento sob consulta — confirmamos o valor após avaliação no atendimento.";

type Slot = { hora: string; ocupado: boolean };

type PublicServico = { id: string; name: string; duration_min: number };

function parseMinAg(t: string) {
  const s = (t || "09:00").slice(0, 5);
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Inícios possíveis a cada slotStepMin; cada um reserva serviceDurMin sem cruzar bloqueios. */
function gerarSlots(
  startTime: string,
  endTime: string,
  slotStepMin: number,
  serviceDurMin: number,
  bloqueios: { start: number; dur: number }[]
): Slot[] {
  const slots: Slot[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let cur = sh * 60 + sm;
  const fim = eh * 60 + em;
  const step = Math.max(5, Math.min(60, slotStepMin));
  const dur = Math.max(5, serviceDurMin);

  function livre(start: number): boolean {
    if (start + dur > fim) return false;
    for (const b of bloqueios) {
      const bEnd = b.start + b.dur;
      if (start < bEnd && start + dur > b.start) return false;
    }
    return true;
  }

  while (cur + dur <= fim) {
    const h = String(Math.floor(cur / 60)).padStart(2, "0");
    const m = String(cur % 60).padStart(2, "0");
    const hora = `${h}:${m}`;
    slots.push({ hora, ocupado: !livre(cur) });
    cur += step;
  }
  return slots;
}

function apenasDisponiveis(slots: Slot[]) {
  return slots.filter((s) => !s.ocupado);
}

function formatarData(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function addDias(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function waHref(phone: string, text: string) {
  const tel = String(phone || "").replace(/\D/g, "");
  if (!tel) return "";
  const finalTel = tel.startsWith("55") ? tel : `55${tel}`;
  return `https://wa.me/${finalTel}?text=${encodeURIComponent(text)}`;
}

const inputClass =
  "w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-[#C9A66B] backdrop-blur-sm";

export default function AgendarPage() {
  const { id } = useParams<{ id: string }>();

  const [perfil, setPerfil] = useState<any>(null);
  const [disponibilidade, setDisponibilidade] = useState<any[]>([]);
  const [agendados, setAgendados] = useState<any[]>([]);
  const [servicos, setServicos] = useState<PublicServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [semanaOffset, setSemanaOffset] = useState(0);
  const [dataSel, setDataSel] = useState<Date | null>(null);
  const [horaSel, setHoraSel] = useState<string>("");
  const [servicoSel, setServicoSel] = useState<PublicServico | null>(null);

  type EquipePub = { id: string; name: string; role_label: string | null };
  const [equipe, setEquipe] = useState<EquipePub[]>([]);
  const [equipeObrig, setEquipeObrig] = useState(false);
  /** undefined = ainda nao escolheu (quando ha equipe); null = responsavel/dono */
  const [staffPublicKey, setStaffPublicKey] = useState<string | null | undefined>(null);

  const [form, setForm] = useState({ client_name: "", client_phone: "", service: "" });
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/agendar/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) {
          setErro(d.error || "Profissional não encontrado");
          return;
        }
        setPerfil(d.perfil);
        setDisponibilidade(d.disponibilidade);
        setAgendados(d.agendados);
        const list: PublicServico[] = d.servicos || [];
        setServicos(list);
        setEquipe(d.equipe || []);
        const obr = d.equipe_obrigatoria === true;
        setEquipeObrig(obr);
        setStaffPublicKey(obr ? undefined : null);
        if (list.length === 0) {
          setServicoSel({ id: "", name: "", duration_min: 60 });
        } else {
          setServicoSel(null);
        }
      })
      .catch(() => setErro("Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [id]);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dias = Array.from({ length: 7 }, (_, i) => addDias(hoje, semanaOffset * 7 + i)).filter((d) => d >= hoje);

  const duracaoProcedimento = servicoSel?.duration_min || 60;
  const temCatalogo = servicos.length > 0;
  const podeEscolherAgenda = !temCatalogo || servicoSel != null;

  const nomeSalao = String(perfil?.barber_shop || "").trim();
  const nomePessoa = String(perfil?.full_name || "").trim();
  const tituloAgenda = nomeSalao || nomePessoa;
  const mostrarProfissionalNoTopo = Boolean(nomeSalao && nomePessoa);
  const whatsappContato = String(perfil?.whatsapp || "").trim();
  const msgSemAgenda = `Ola! Vim pelo link de agendamento de ${tituloAgenda || nomePessoa || "vocês"} e gostaria de verificar horarios.`;

  function getDisp(d: Date) {
    return disponibilidade.find((di) => di.day_of_week === d.getDay());
  }

  function getSlots(d: Date): Slot[] {
    const disp = getDisp(d);
    if (!disp || !podeEscolherAgenda) return [];
    const iso = toISO(d);
    const bloqueios = agendados
      .filter((a) => a.appointment_date === iso)
      .map((a) => ({
        start: parseMinAg(a.appointment_time),
        dur: Number(a.duration_min) || 60,
      }));
    const step = Math.max(5, Math.min(60, Number(disp.slot_duration_min) || 30));
    return gerarSlots(
      disp.start_time.slice(0, 5),
      disp.end_time.slice(0, 5),
      step,
      duracaoProcedimento,
      bloqueios
    );
  }

  function getSlotsFiltradoHoje(d: Date): Slot[] {
    const todos = apenasDisponiveis(getSlots(d));
    const iso = toISO(d);
    const hojeISO = toISO(new Date());
    if (iso !== hojeISO) return todos;
    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes() + 30;
    return todos.filter((s) => {
      const [h, m] = s.hora.split(":").map(Number);
      return h * 60 + m > minutosAgora;
    });
  }

  function selecionarServico(s: PublicServico) {
    setServicoSel(s);
    setDataSel(null);
    setHoraSel("");
  }

  function selecionarProfissionalPub(staffId: string | null) {
    setStaffPublicKey(staffId);
    setDataSel(null);
    setHoraSel("");
    if (servicos.length > 0) {
      setServicoSel(null);
    } else {
      setServicoSel({ id: "", name: "", duration_min: 60 });
    }
  }

  async function agendar() {
    if (!id || !dataSel || !horaSel || !form.client_name) return;
    if (equipeObrig && staffPublicKey === undefined) {
      alert("Selecione o profissional.");
      return;
    }
    if (temCatalogo && !servicoSel?.id) return;
    if (!temCatalogo && !form.service.trim()) {
      alert("Descreva o serviço desejado.");
      return;
    }
    setEnviando(true);
    const res = await fetch(`/api/agendar/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: form.client_name,
        client_phone: form.client_phone,
        service: temCatalogo ? servicoSel!.name : form.service.trim(),
        service_id: temCatalogo ? servicoSel!.id : undefined,
        appointment_date: toISO(dataSel),
        appointment_time: horaSel,
        ...(temCatalogo ? {} : { duration_min: 60 }),
        ...(equipeObrig ? { staff_id: staffPublicKey ?? null } : {}),
      }),
    });
    const d = await res.json();
    if (d.ok) setSucesso(true);
    else alert(d.error || "Erro ao agendar");
    setEnviando(false);
  }

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-[#C9A66B]" size={40} />
      </div>
    );

  if (erro)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center px-4">
          <p className="text-zinc-500 text-sm">{erro}</p>
        </div>
      </div>
    );

  if (sucesso)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-900/30 border-2 border-green-500 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase mb-2">Agendado!</h1>
          <p className="text-zinc-400 text-sm mb-1">
            <strong className="text-white">{form.client_name}</strong>, seu horário foi solicitado para:
          </p>
          <p className="text-[#C9A66B] font-black text-lg mb-1">{dataSel ? formatarData(dataSel) : ""}</p>
          <p className="text-white font-bold text-xl mb-2">às {horaSel}</p>
          {servicoSel?.name && (
            <p className="text-zinc-500 text-xs mb-2">
              Procedimento: <span className="text-zinc-300 font-bold">{servicoSel.name}</span> (≈ {duracaoProcedimento}{" "}
              min na agenda)
            </p>
          )}
          {!temCatalogo && form.service && (
            <p className="text-zinc-500 text-xs mb-2">
              Serviço: <span className="text-zinc-300 font-bold">{form.service}</span>
            </p>
          )}
          <p className="text-zinc-500 text-xs">O profissional irá confirmar em breve. Anote o horário!</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gradient-to-b from-zinc-900 to-black px-6 pt-10 pb-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#C9A66B]/20 border border-[#C9A66B]/30 flex items-center justify-center mx-auto mb-4">
          <Scissors size={28} className="text-[#C9A66B]" />
        </div>
        <h1 className="text-2xl font-black uppercase">{tituloAgenda}</h1>
        {mostrarProfissionalNoTopo && (
          <p className="text-zinc-400 font-semibold text-sm mt-1">Atendimento: {nomePessoa}</p>
        )}
        {(perfil?.city || perfil?.state) && (
          <p className="text-zinc-500 text-xs mt-1 flex items-center justify-center gap-1">
            <MapPin size={11} /> {[perfil.city, perfil.state].filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      <div className="px-4 pb-16 max-w-lg mx-auto">
        {disponibilidade.length === 0 ? (
          <div className="text-center mt-16 text-zinc-600 max-w-sm mx-auto">
            <Calendar size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold text-sm">Agenda ainda não foi aberta</p>
            <p className="text-xs mt-2 leading-relaxed">
              Este salão ainda não configurou horários online. Você pode falar direto com o profissional para combinar seu atendimento.
            </p>
            {whatsappContato && (
              <a
                href={waHref(whatsappContato, msgSemAgenda)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl border border-emerald-700/60 bg-emerald-950/30 text-emerald-300 text-xs font-black uppercase tracking-wider"
              >
                <MessageCircle size={14} /> Chamar no WhatsApp
              </a>
            )}
          </div>
        ) : (
          <>
            {equipeObrig && (
              <div className="mb-8">
                <h2 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-2">Profissional</h2>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => selecionarProfissionalPub(null)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
                      staffPublicKey === null
                        ? "bg-[#C9A66B]/15 border-[#C9A66B] ring-1 ring-[#C9A66B]/40"
                        : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
                    }`}
                  >
                    <p className="font-black text-sm text-white">{nomePessoa || "Responsável pelo salão"}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Agenda do dono / responsável</p>
                  </button>
                  {equipe.map((m) => {
                    const sel = staffPublicKey === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => selecionarProfissionalPub(m.id)}
                        className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
                          sel
                            ? "bg-[#C9A66B]/15 border-[#C9A66B] ring-1 ring-[#C9A66B]/40"
                            : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
                        }`}
                      >
                        <p className="font-black text-sm text-white">{m.name}</p>
                        {m.role_label ? (
                          <p className="text-[10px] text-zinc-500 mt-1">{m.role_label}</p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {temCatalogo && (
              <div className="mb-8">
                <h2 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-1">Procedimento</h2>
                <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">{TEXTO_VALOR_PROCEDIMENTO_CLIENTE}</p>
                <div className="space-y-2">
                  {servicos.map((s) => {
                    const sel = servicoSel?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selecionarServico(s)}
                        className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
                          sel
                            ? "bg-[#C9A66B]/15 border-[#C9A66B] ring-1 ring-[#C9A66B]/40"
                            : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-black text-sm text-white">{s.name}</p>
                          <span className="text-[10px] font-bold text-zinc-500 shrink-0 flex items-center gap-1">
                            <Clock size={12} /> {s.duration_min} min
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-2 italic leading-snug">
                          {TEXTO_VALOR_PROCEDIMENTO_CLIENTE}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!temCatalogo && (
              <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-[11px] text-zinc-400 leading-relaxed">{TEXTO_VALOR_PROCEDIMENTO_CLIENTE}</p>
              </div>
            )}

            {podeEscolherAgenda && (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-black uppercase text-zinc-400 tracking-widest">Escolha o dia</h2>
                    <div className="flex gap-1">
                      <button
                        disabled={semanaOffset === 0}
                        onClick={() => setSemanaOffset((s) => s - 1)}
                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 disabled:opacity-30"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => setSemanaOffset((s) => s + 1)}
                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {dias.map((d) => {
                      const disp = getDisp(d);
                      const slots = getSlotsFiltradoHoje(d);
                      const temLivre = slots.length > 0;
                      const sel = dataSel && toISO(dataSel) === toISO(d);
                      return (
                        <button
                          key={toISO(d)}
                          disabled={!disp || !temLivre}
                          onClick={() => {
                            setDataSel(d);
                            setHoraSel("");
                          }}
                          className={`flex flex-col items-center py-2.5 px-1 rounded-xl border transition-all text-center ${
                            sel
                              ? "bg-[#C9A66B] border-[#C9A66B] text-black"
                              : !disp || !temLivre
                                ? "border-zinc-900 text-zinc-700 bg-zinc-950 cursor-not-allowed"
                                : "border-zinc-800 bg-zinc-900 text-white hover:border-zinc-600"
                          }`}
                        >
                          <span className="text-[9px] font-bold uppercase">
                            {["D", "S", "T", "Q", "Q", "S", "S"][d.getDay()]}
                          </span>
                          <span className="text-base font-black">{d.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {dataSel && (
                  <div className="mb-6">
                    <h2 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-2">
                      Horários — {formatarData(dataSel)}
                    </h2>
                    <p className="text-[10px] text-zinc-600 mb-3">
                      Período reservado na agenda:{" "}
                      <span className="text-zinc-400 font-bold">{duracaoProcedimento} min</span> a partir do horário
                      escolhido.
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {getSlotsFiltradoHoje(dataSel).map((s) => (
                        <button
                          key={s.hora}
                          onClick={() => setHoraSel(s.hora)}
                          className={`py-2.5 rounded-xl text-sm font-black border transition-all ${
                            horaSel === s.hora
                              ? "bg-[#C9A66B] border-[#C9A66B] text-black"
                              : "border-zinc-800 bg-zinc-900 text-white hover:border-zinc-600"
                          }`}
                        >
                          {s.hora}
                        </button>
                      ))}
                    </div>
                    {getSlotsFiltradoHoje(dataSel).length === 0 && (
                      <p className="text-[11px] text-zinc-500">
                        Nao ha horarios disponiveis para este dia.
                      </p>
                    )}
                  </div>
                )}

                {dataSel && horaSel && (
                  <div className="space-y-3">
                    <div className="bg-[#C9A66B]/10 border border-[#C9A66B]/30 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4">
                      <Calendar size={16} className="text-[#C9A66B]" />
                      <div>
                        <p className="text-xs text-zinc-400">Horário selecionado</p>
                        <p className="font-black text-sm">
                          {formatarData(dataSel)} às {horaSel}
                          <span className="text-zinc-500 font-normal text-xs block mt-0.5">
                            Duração na agenda: {duracaoProcedimento} min
                          </span>
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        Seu nome *
                      </label>
                      <input
                        value={form.client_name}
                        onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                        className={inputClass}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        WhatsApp
                      </label>
                      <input
                        value={form.client_phone}
                        onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))}
                        className={inputClass}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    {!temCatalogo && (
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                          Serviço desejado
                        </label>
                        <input
                          value={form.service}
                          onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                          className={inputClass}
                          placeholder="Ex: Corte masculino, Barba..."
                        />
                        <p className="text-[10px] text-zinc-600 mt-1">{TEXTO_VALOR_PROCEDIMENTO_CLIENTE}</p>
                      </div>
                    )}
                    <button
                      onClick={agendar}
                      disabled={enviando || !form.client_name}
                      className="w-full mt-2 bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-sm tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2"
                    >
                      {enviando ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      {enviando ? "Agendando..." : "Confirmar Agendamento"}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
