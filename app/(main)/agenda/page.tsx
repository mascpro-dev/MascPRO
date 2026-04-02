"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  MessageCircle,
  Pencil,
  Trash2,
  X,
  Copy,
  CheckCircle,
  Cake,
} from "lucide-react";

type Appointment = {
  id: string;
  client_name: string;
  client_phone: string | null;
  service: string | null;
  appointment_date: string;
  appointment_time: string;
  duration_min: number;
  price: number | null;
  status: string;
  notes: string | null;
};

type ProClient = { id: string; name: string; phone: string | null; birthday: string | null; notes: string | null };
type ProService = { id: string; name: string; price: number; duration_min: number; active: boolean };
type ProExpense = { id: string; description: string; amount: number; category: string; expense_date: string };
type ProCharge = { id: string; client_name: string; client_phone: string | null; description: string | null; amount: number; paid: boolean; charge_date: string };

const EXP_CATS = [
  { v: "produtos", l: "Produtos" },
  { v: "acessorios", l: "Acessorios" },
  { v: "aluguel", l: "Aluguel" },
  { v: "contas", l: "Contas" },
  { v: "marketing", l: "Marketing" },
  { v: "comissao", l: "Comissao" },
  { v: "impostos", l: "Impostos" },
  { v: "diversos", l: "Diversos" },
];

const STATUS_STYLE: Record<string, string> = {
  pendente: "border-amber-500/50 bg-amber-950/40",
  confirmado: "border-blue-500/50 bg-blue-950/30",
  concluido: "border-emerald-500/50 bg-emerald-950/30",
  cancelado: "border-zinc-600 bg-zinc-900/50 opacity-60",
};

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeekSun(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseMin(t: string) {
  const s = (t || "09:00").slice(0, 5);
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function waLink(phone: string, text: string) {
  const tel = phone.replace(/\D/g, "");
  const f = tel.startsWith("55") ? tel : `55${tel}`;
  return `https://wa.me/${f}?text=${encodeURIComponent(text)}`;
}

const START_MIN = 7 * 60;
const END_MIN = 21 * 60;
const SLOT = 30;
const PX = 44;

export default function AgendaGestaoPage() {
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState("");
  const [aba, setAba] = useState<"agenda" | "clientes" | "servicos" | "financeiro">("agenda");
  const [finSub, setFinSub] = useState<"resumo" | "fluxo" | "despesas" | "cobrancas">("resumo");
  const [mesFin, setMesFin] = useState(() => new Date().toISOString().slice(0, 7));

  const [dia, setDia] = useState(() => new Date());
  const diaStr = toISO(dia);

  const [apts, setApts] = useState<Appointment[]>([]);
  const [loadA, setLoadA] = useState(false);
  const [clients, setClients] = useState<ProClient[]>([]);
  const [services, setServices] = useState<ProService[]>([]);
  const [expenses, setExpenses] = useState<ProExpense[]>([]);
  const [charges, setCharges] = useState<ProCharge[]>([]);
  const [fin, setFin] = useState<any>(null);

  const [modalApt, setModalApt] = useState<Appointment | "new" | null>(null);
  const [formApt, setFormApt] = useState({
    client_name: "",
    client_phone: "",
    service: "",
    appointment_time: "",
    duration_min: "60",
    price: "",
    notes: "",
    status: "confirmado",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [linkOk, setLinkOk] = useState(false);

  const [modalClient, setModalClient] = useState<ProClient | "new" | null>(null);
  const [formCli, setFormCli] = useState({ name: "", phone: "", birthday: "", notes: "" });

  const [modalSvc, setModalSvc] = useState<ProService | "new" | null>(null);
  const [formSvc, setFormSvc] = useState({ name: "", price: "", duration_min: "60" });

  const [formExp, setFormExp] = useState({ description: "", amount: "", category: "produtos", expense_date: diaStr });
  const [formChg, setFormChg] = useState({ client_name: "", client_phone: "", description: "", amount: "", charge_date: diaStr });

  const weekDays = useMemo(() => {
    const s = startOfWeekSun(dia);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      return d;
    });
  }, [dia]);

  const labelsDow = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, [supabase]);

  const carregarDia = useCallback(async () => {
    setLoadA(true);
    const r = await fetch(`/api/agenda?dia=${diaStr}`);
    const d = await r.json();
    setApts(d.appointments || []);
    setLoadA(false);
  }, [diaStr]);

  const carregarClientes = useCallback(async () => {
    const r = await fetch("/api/pro/gestao/clients");
    const d = await r.json();
    if (d.ok) setClients(d.clients || []);
  }, []);

  const carregarServicos = useCallback(async () => {
    const r = await fetch("/api/pro/gestao/services");
    const d = await r.json();
    if (d.ok) setServices((d.services || []).filter((x: ProService) => x.active !== false));
  }, []);

  const carregarDespesas = useCallback(async () => {
    const r = await fetch(`/api/pro/gestao/expenses?mes=${mesFin}`);
    const d = await r.json();
    if (d.ok) setExpenses(d.expenses || []);
  }, [mesFin]);

  const carregarCobrancas = useCallback(async () => {
    const r = await fetch("/api/pro/gestao/charges");
    const d = await r.json();
    if (d.ok) setCharges(d.charges || []);
  }, []);

  const carregarFin = useCallback(async () => {
    const r = await fetch(`/api/pro/gestao/financeiro?mes=${mesFin}`);
    const d = await r.json();
    if (d.ok) setFin(d);
  }, [mesFin]);

  useEffect(() => {
    if (aba === "agenda") carregarDia();
  }, [aba, carregarDia]);

  useEffect(() => {
    if (aba === "clientes") carregarClientes();
  }, [aba, carregarClientes]);

  useEffect(() => {
    if (aba === "servicos") carregarServicos();
  }, [aba, carregarServicos]);

  useEffect(() => {
    if (aba === "financeiro") {
      carregarFin();
      carregarDespesas();
      carregarCobrancas();
    }
  }, [aba, mesFin, carregarFin, carregarDespesas, carregarCobrancas]);

  function abrirNovoApt() {
    setErr("");
    setFormApt({
      client_name: "",
      client_phone: "",
      service: "",
      appointment_time: "09:00",
      duration_min: "60",
      price: "",
      notes: "",
      status: "confirmado",
    });
    setModalApt("new");
  }

  function abrirEditApt(a: Appointment) {
    setErr("");
    setFormApt({
      client_name: a.client_name,
      client_phone: a.client_phone || "",
      service: a.service || "",
      appointment_time: a.appointment_time.slice(0, 5),
      duration_min: String(a.duration_min || 60),
      price: a.price != null ? String(a.price) : "",
      notes: a.notes || "",
      status: a.status,
    });
    setModalApt(a);
  }

  async function salvarApt() {
    setSaving(true);
    setErr("");
    const body =
      modalApt === "new"
        ? { ...formApt, appointment_date: diaStr }
        : { id: (modalApt as Appointment).id, ...formApt, appointment_date: diaStr };
    const method = modalApt === "new" ? "POST" : "PATCH";
    const r = await fetch("/api/agenda", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!d.ok) setErr(d.error || "Erro ao salvar");
    else {
      setModalApt(null);
      carregarDia();
    }
    setSaving(false);
  }

  async function excluirApt(id: string) {
    if (!confirm("Excluir agendamento?")) return;
    await fetch("/api/agenda", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    carregarDia();
    setModalApt(null);
  }

  async function salvarCliente() {
    setSaving(true);
    if (modalClient === "new") {
      await fetch("/api/pro/gestao/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formCli),
      });
    } else if (modalClient) {
      await fetch("/api/pro/gestao/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: (modalClient as ProClient).id, ...formCli }),
      });
    }
    setModalClient(null);
    carregarClientes();
    setSaving(false);
  }

  async function salvarServico() {
    setSaving(true);
    const payload = {
      name: formSvc.name,
      price: formSvc.price === "" ? 0 : Number(formSvc.price),
      duration_min: Number(formSvc.duration_min) || 60,
    };
    if (modalSvc === "new") {
      await fetch("/api/pro/gestao/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else if (modalSvc) {
      await fetch("/api/pro/gestao/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: (modalSvc as ProService).id, ...payload }),
      });
    }
    setModalSvc(null);
    carregarServicos();
    setSaving(false);
  }

  async function salvarDespesa() {
    if (!formExp.description || !formExp.amount) return;
    await fetch("/api/pro/gestao/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formExp),
    });
    setFormExp({ ...formExp, description: "", amount: "" });
    carregarDespesas();
    carregarFin();
  }

  async function salvarCobranca() {
    if (!formChg.client_name || !formChg.amount) return;
    await fetch("/api/pro/gestao/charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formChg),
    });
    setFormChg({ ...formChg, client_name: "", amount: "", description: "" });
    carregarCobrancas();
    carregarFin();
  }

  const slots = useMemo(() => {
    const n = (END_MIN - START_MIN) / SLOT;
    return Array.from({ length: n }, (_, i) => START_MIN + i * SLOT);
  }, []);

  const hoje = toISO(new Date());
  const aniversariantes = useMemo(() => {
    const agora = new Date();
    const lim = new Date(agora);
    lim.setDate(lim.getDate() + 14);
    return clients.filter((c) => {
      if (!c.birthday) return false;
      const [y, m, day] = c.birthday.split("-").map(Number);
      const bThisYear = new Date(agora.getFullYear(), m - 1, day);
      const bNext = new Date(agora.getFullYear() + 1, m - 1, day);
      let b = bThisYear;
      if (bThisYear < agora) b = bNext;
      return b >= agora && b <= lim;
    });
  }, [clients]);

  const chargesByClient = useMemo(() => {
    const unpaid = charges.filter((c) => !c.paid);
    const g: Record<string, ProCharge[]> = {};
    for (const c of unpaid) {
      if (!g[c.client_name]) g[c.client_name] = [];
      g[c.client_name].push(c);
    }
    return g;
  }, [charges]);

  function aplicarCliente(c: ProClient) {
    setFormApt((f) => ({
      ...f,
      client_name: c.name,
      client_phone: c.phone || "",
    }));
  }

  function aplicarServico(s: ProService) {
    setFormApt((f) => ({
      ...f,
      service: s.name,
      price: String(s.price),
      duration_min: String(s.duration_min || 60),
    }));
  }

  async function copiarLink() {
    if (!userId || typeof window === "undefined") return;
    const u = `${window.location.origin}/agendar/${userId}`;
    await navigator.clipboard.writeText(u);
    setLinkOk(true);
    setTimeout(() => setLinkOk(false), 2500);
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-white">
            Gestao <span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
            Agenda, clientes, servicos e financeiro
          </p>
        </div>
        {userId && (
          <button
            type="button"
            onClick={copiarLink}
            className="flex items-center gap-2 text-xs font-black uppercase bg-zinc-900 border border-zinc-700 text-[#C9A66B] px-4 py-2 rounded-xl"
          >
            {linkOk ? <CheckCircle size={14} /> : <Copy size={14} />}
            {linkOk ? "Copiado!" : "Link publico agendar"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ["agenda", "Agenda"],
            ["clientes", "Clientes"],
            ["servicos", "Servicos"],
            ["financeiro", "Financeiro"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setAba(k)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${
              aba === k
                ? "bg-[#C9A66B] text-black border-[#C9A66B]"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* AGENDA */}
      {aba === "agenda" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => {
                const x = new Date(dia);
                x.setDate(x.getDate() - 7);
                setDia(x);
              }}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-bold text-[#C9A66B] capitalize">
              {dia.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <button
              type="button"
              onClick={() => {
                const x = new Date(dia);
                x.setDate(x.getDate() + 7);
                setDia(x);
              }}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map((d, i) => {
              const ds = toISO(d);
              const sel = ds === diaStr;
              const isToday = ds === hoje;
              return (
                <button
                  key={ds}
                  type="button"
                  onClick={() => setDia(new Date(d))}
                  className={`flex flex-col items-center py-2 rounded-xl border text-center transition-all ${
                    sel
                      ? "bg-[#C9A66B] border-[#C9A66B] text-black"
                      : isToday
                        ? "border-red-500/60 bg-red-950/20 text-white"
                        : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-[9px] font-bold opacity-80">{labelsDow[i]}</span>
                  <span className="text-lg font-black">{d.getDate()}</span>
                </button>
              );
            })}
          </div>

          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/80 overflow-hidden min-h-[480px]">
            {loadA && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                <Loader2 className="animate-spin text-[#C9A66B]" />
              </div>
            )}
            <div className="flex">
              <div className="w-14 shrink-0 border-r border-zinc-800">
                {slots.map((m) => (
                  <div
                    key={m}
                    style={{ height: PX }}
                    className="text-[10px] text-zinc-500 font-mono flex items-start justify-end pr-2 pt-0.5 border-b border-zinc-800/50"
                  >
                    {String(Math.floor(m / 60)).padStart(2, "0")}:{String(m % 60).padStart(2, "0")}
                  </div>
                ))}
              </div>
              <div className="flex-1 relative" style={{ height: slots.length * PX }}>
                {apts.map((a) => {
                  const start = parseMin(a.appointment_time);
                  const dur = Number(a.duration_min) || 60;
                  if (start + dur <= START_MIN || start >= END_MIN) return null;
                  const top = ((Math.max(start, START_MIN) - START_MIN) / SLOT) * PX;
                  const h = (Math.min(start + dur, END_MIN) - Math.max(start, START_MIN)) / SLOT * PX;
                  const st = STATUS_STYLE[a.status] || STATUS_STYLE.confirmado;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => abrirEditApt(a)}
                      className={`absolute left-1 right-1 rounded-xl border px-2 py-1 text-left overflow-hidden ${st}`}
                      style={{ top, height: Math.max(h, 36) }}
                    >
                      <p className="text-[10px] font-black text-white truncate">
                        {a.appointment_time.slice(0, 5)} · {a.client_name}
                      </p>
                      <p className="text-[9px] text-zinc-400 truncate">{a.service || "Servico"}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirNovoApt}
            className="fixed bottom-6 right-6 md:absolute md:bottom-auto md:right-auto md:relative md:mt-4 w-14 h-14 rounded-full bg-[#C9A66B] text-black flex items-center justify-center shadow-lg z-[100]"
          >
            <Plus size={28} />
          </button>
        </>
      )}

      {/* CLIENTES */}
      {aba === "clientes" && (
        <div className="space-y-4">
          {aniversariantes.length > 0 && (
            <div className="rounded-2xl border border-pink-500/30 bg-pink-950/20 p-4">
              <p className="text-xs font-black uppercase text-pink-300 flex items-center gap-2 mb-2">
                <Cake size={14} /> Proximos aniversarios (14 dias)
              </p>
              <div className="flex flex-wrap gap-2">
                {aniversariantes.map((c) => (
                  <span key={c.id} className="text-xs bg-zinc-900 px-2 py-1 rounded-lg text-white">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setFormCli({ name: "", phone: "", birthday: "", notes: "" });
              setModalClient("new");
            }}
            className="w-full py-3 rounded-xl bg-[#C9A66B] text-black font-black uppercase text-xs"
          >
            + Novo cliente
          </button>
          <div className="space-y-2">
            {clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setFormCli({
                    name: c.name,
                    phone: c.phone || "",
                    birthday: c.birthday || "",
                    notes: c.notes || "",
                  });
                  setModalClient(c);
                }}
                className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between"
              >
                <span className="font-bold text-white">{c.name}</span>
                {c.phone && <span className="text-xs text-zinc-500">{c.phone}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SERVICOS */}
      {aba === "servicos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["Corte masc.", "Barba", "Pezinho", "Sobrancelha", "Pigmentacao"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setFormSvc({ name: chip, price: "", duration_min: "60" });
                  setModalSvc("new");
                }}
                className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-zinc-800 text-[#C9A66B] border border-zinc-700"
              >
                {chip}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setFormSvc({ name: "", price: "", duration_min: "60" });
              setModalSvc("new");
            }}
            className="w-full py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-[#C9A66B] font-black uppercase text-xs"
          >
            + Cadastrar servico
          </button>
          {services.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-white">{s.name}</p>
                <p className="text-xs text-zinc-500">
                  {fmtMoney(Number(s.price))} · {s.duration_min} min
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormSvc({
                    name: s.name,
                    price: String(s.price),
                    duration_min: String(s.duration_min),
                  });
                  setModalSvc(s);
                }}
                className="p-2 text-zinc-400"
              >
                <Pencil size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FINANCEIRO */}
      {aba === "financeiro" && (
        <div className="space-y-4">
          <input
            type="month"
            value={mesFin}
            onChange={(e) => setMesFin(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
            style={{ colorScheme: "dark" }}
          />
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["resumo", "Resumo"],
                ["fluxo", "Fluxo diario"],
                ["despesas", "Despesas"],
                ["cobrancas", "Cobrancas"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFinSub(k)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${
                  finSub === k ? "bg-[#C9A66B] text-black" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {finSub === "resumo" && fin && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-4">
                <p className="text-[10px] font-black uppercase text-emerald-400">Receita</p>
                <p className="text-2xl font-black text-white">{fmtMoney(fin.resumo.receita)}</p>
              </div>
              <div className="rounded-2xl border border-red-800/40 bg-red-950/20 p-4">
                <p className="text-[10px] font-black uppercase text-red-400">Despesas</p>
                <p className="text-2xl font-black text-white">{fmtMoney(fin.resumo.despesas)}</p>
              </div>
              <div className="rounded-2xl border border-[#C9A66B]/40 bg-[#C9A66B]/10 p-4">
                <p className="text-[10px] font-black uppercase text-[#C9A66B]">Lucro</p>
                <p className="text-2xl font-black text-white">{fmtMoney(fin.resumo.lucro)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">A receber: {fmtMoney(fin.resumo.a_receber)}</p>
              </div>
            </div>
          )}

          {finSub === "resumo" && fin?.porCategoria && Object.keys(fin.porCategoria).length > 0 && (
            <div className="rounded-2xl border border-zinc-800 p-4">
              <p className="text-xs font-black uppercase text-zinc-400 mb-2">Despesas por categoria</p>
              {Object.entries(fin.porCategoria).map(([cat, val]) => (
                <div key={cat} className="flex justify-between text-sm py-1 border-b border-zinc-800/50">
                  <span className="text-zinc-300">{cat}</span>
                  <span className="text-red-300">{fmtMoney(Number(val))}</span>
                </div>
              ))}
            </div>
          )}

          {finSub === "resumo" && fin?.topServicos?.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 p-4">
              <p className="text-xs font-black uppercase text-zinc-400 mb-2">Top servicos</p>
              {fin.topServicos.map((s: any) => (
                <div key={s.name} className="flex justify-between text-sm py-1">
                  <span className="text-white">{s.name}</span>
                  <span className="text-[#C9A66B]">{fmtMoney(s.total)}</span>
                </div>
              ))}
            </div>
          )}

          {finSub === "resumo" && fin?.topClientes?.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 p-4">
              <p className="text-xs font-black uppercase text-zinc-400 mb-2">Melhores clientes (mes)</p>
              {fin.topClientes.map((c: any, i: number) => (
                <div key={c.name} className="flex justify-between text-sm py-1">
                  <span className="text-zinc-300">
                    {i + 1}. {c.name}
                  </span>
                  <span className="text-white font-bold">{fmtMoney(c.total)}</span>
                </div>
              ))}
            </div>
          )}

          {finSub === "fluxo" && fin?.fluxoDiario && (
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="grid grid-cols-4 gap-2 text-[10px] font-black uppercase text-zinc-500 p-3 bg-zinc-900 border-b border-zinc-800">
                <span>Dia</span>
                <span>Receita</span>
                <span>Despesa</span>
                <span>Resultado</span>
              </div>
              {fin.fluxoDiario.map((row: any) => (
                <div key={row.dia} className="grid grid-cols-4 gap-2 text-xs p-3 border-b border-zinc-800/80">
                  <span className="text-zinc-400">{row.dia.slice(8)}</span>
                  <span className="text-emerald-400">{fmtMoney(row.receita)}</span>
                  <span className="text-red-400">{fmtMoney(row.despesa)}</span>
                  <span className={row.resultado >= 0 ? "text-emerald-300" : "text-red-300"}>
                    {fmtMoney(row.resultado)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {finSub === "despesas" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 p-4 space-y-3">
                <p className="text-xs font-black uppercase text-[#C9A66B]">Nova despesa</p>
                <input
                  placeholder="Descricao"
                  value={formExp.description}
                  onChange={(e) => setFormExp({ ...formExp, description: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Valor"
                    type="number"
                    value={formExp.amount}
                    onChange={(e) => setFormExp({ ...formExp, amount: e.target.value })}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={formExp.expense_date}
                    onChange={(e) => setFormExp({ ...formExp, expense_date: e.target.value })}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                <select
                  value={formExp.category}
                  onChange={(e) => setFormExp({ ...formExp, category: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                >
                  {EXP_CATS.map((c) => (
                    <option key={c.v} value={c.v}>
                      {c.l}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={salvarDespesa}
                  className="w-full py-2 rounded-xl bg-[#C9A66B] text-black font-black text-xs uppercase"
                >
                  Salvar despesa
                </button>
              </div>
              {expenses.map((e) => (
                <div key={e.id} className="rounded-xl border border-zinc-800 p-3 flex justify-between">
                  <div>
                    <p className="font-bold text-white text-sm">{e.description}</p>
                    <p className="text-[10px] text-zinc-500">
                      {e.expense_date} · {e.category}
                    </p>
                  </div>
                  <span className="text-red-300 font-bold">{fmtMoney(Number(e.amount))}</span>
                </div>
              ))}
            </div>
          )}

          {finSub === "cobrancas" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 p-4 space-y-3">
                <p className="text-xs font-black uppercase text-[#C9A66B]">Nova cobranca</p>
                <input
                  placeholder="Cliente"
                  value={formChg.client_name}
                  onChange={(e) => setFormChg({ ...formChg, client_name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  placeholder="WhatsApp"
                  value={formChg.client_phone}
                  onChange={(e) => setFormChg({ ...formChg, client_phone: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  placeholder="Servicos / obs"
                  value={formChg.description}
                  onChange={(e) => setFormChg({ ...formChg, description: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Valor"
                    type="number"
                    value={formChg.amount}
                    onChange={(e) => setFormChg({ ...formChg, amount: e.target.value })}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={formChg.charge_date}
                    onChange={(e) => setFormChg({ ...formChg, charge_date: e.target.value })}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={salvarCobranca}
                  className="w-full py-2 rounded-xl bg-[#C9A66B] text-black font-black text-xs uppercase"
                >
                  Registrar
                </button>
              </div>
              {Object.entries(chargesByClient).map(([nome, lista]) => {
                const tot = lista.reduce((s, c) => s + Number(c.amount), 0);
                return (
                  <div key={nome} className="rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="bg-zinc-800/80 px-3 py-2 flex justify-between text-sm font-bold">
                      <span>{nome}</span>
                      <span className="text-red-300">Devendo: {fmtMoney(tot)}</span>
                    </div>
                    {lista.map((c) => (
                      <div key={c.id} className="px-3 py-2 border-t border-zinc-800 flex justify-between items-center text-xs">
                        <span className="text-zinc-400">{c.description || "—"}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-red-200 font-bold">{fmtMoney(Number(c.amount))}</span>
                          <button
                            type="button"
                            onClick={() =>
                              fetch("/api/pro/gestao/charges", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: c.id, paid: true }),
                              }).then(() => {
                                carregarCobrancas();
                                carregarFin();
                              })
                            }
                            className="text-[10px] text-emerald-400 font-bold"
                          >
                            Pago
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL AGENDAMENTO */}
      {modalApt && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
              <h3 className="font-black uppercase text-sm">
                {modalApt === "new" ? "Novo agendamento" : "Editar"}
              </h3>
              <button type="button" onClick={() => setModalApt(null)}>
                <X size={20} className="text-zinc-500" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {clients.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Cliente cadastrado</p>
                  <div className="flex flex-wrap gap-1">
                    {clients.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => aplicarCliente(c)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-zinc-800 text-[#C9A66B]"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <input
                placeholder="Nome do cliente"
                value={formApt.client_name}
                onChange={(e) => setFormApt({ ...formApt, client_name: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              />
              <input
                placeholder="WhatsApp"
                value={formApt.client_phone}
                onChange={(e) => setFormApt({ ...formApt, client_phone: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              />
              {services.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => aplicarServico(s)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              <input
                placeholder="Servico"
                value={formApt.service}
                onChange={(e) => setFormApt({ ...formApt, service: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={formApt.appointment_time}
                  onChange={(e) => setFormApt({ ...formApt, appointment_time: e.target.value })}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                  style={{ colorScheme: "dark" }}
                />
                <input
                  placeholder="Duracao min"
                  value={formApt.duration_min}
                  onChange={(e) => setFormApt({ ...formApt, duration_min: e.target.value })}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <input
                placeholder="Preco R$"
                value={formApt.price}
                onChange={(e) => setFormApt({ ...formApt, price: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              />
              <select
                value={formApt.status}
                onChange={(e) => setFormApt({ ...formApt, status: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              >
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
                <option value="concluido">Concluido</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <textarea
                placeholder="Observacoes"
                value={formApt.notes}
                onChange={(e) => setFormApt({ ...formApt, notes: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm min-h-[70px]"
              />
              {err && <p className="text-red-400 text-xs">{err}</p>}
              <div className="flex flex-wrap gap-2">
                {formApt.client_phone && (
                  <a
                    href={waLink(formApt.client_phone, `Ola ${formApt.client_name}!`)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-emerald-400 px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-800/50"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={salvarApt}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-[#C9A66B] text-black font-black text-xs uppercase"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
              {modalApt !== "new" && (
                <button
                  type="button"
                  onClick={() => excluirApt((modalApt as Appointment).id)}
                  className="w-full py-2 text-red-400 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CLIENTE */}
      {modalClient && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-4 space-y-3">
            <div className="flex justify-between">
              <h3 className="font-black uppercase text-sm">Cliente</h3>
              <button type="button" onClick={() => setModalClient(null)}>
                <X size={18} />
              </button>
            </div>
            <input
              placeholder="Nome"
              value={formCli.name}
              onChange={(e) => setFormCli({ ...formCli, name: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <input
              placeholder="Telefone"
              value={formCli.phone}
              onChange={(e) => setFormCli({ ...formCli, phone: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={formCli.birthday}
              onChange={(e) => setFormCli({ ...formCli, birthday: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              style={{ colorScheme: "dark" }}
            />
            <textarea
              placeholder="Anotacoes / anamnese"
              value={formCli.notes}
              onChange={(e) => setFormCli({ ...formCli, notes: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm min-h-[80px]"
            />
            <button
              type="button"
              onClick={salvarCliente}
              className="w-full py-3 bg-[#C9A66B] text-black font-black text-xs uppercase rounded-xl"
            >
              Salvar
            </button>
            {modalClient !== "new" && (
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/pro/gestao/clients", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: (modalClient as ProClient).id }),
                  });
                  setModalClient(null);
                  carregarClientes();
                }}
                className="w-full py-2 text-red-400 text-xs"
              >
                Excluir cliente
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL SERVICO */}
      {modalSvc && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-4 space-y-3">
            <div className="flex justify-between">
              <h3 className="font-black uppercase text-sm">Servico</h3>
              <button type="button" onClick={() => setModalSvc(null)}>
                <X size={18} />
              </button>
            </div>
            <input
              placeholder="Nome"
              value={formSvc.name}
              onChange={(e) => setFormSvc({ ...formSvc, name: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <input
              placeholder="Preco"
              type="number"
              value={formSvc.price}
              onChange={(e) => setFormSvc({ ...formSvc, price: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <input
              placeholder="Duracao minutos"
              value={formSvc.duration_min}
              onChange={(e) => setFormSvc({ ...formSvc, duration_min: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={salvarServico}
              className="w-full py-3 bg-[#C9A66B] text-black font-black text-xs uppercase rounded-xl"
            >
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
