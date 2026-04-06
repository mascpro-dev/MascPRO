"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Loader2,
  MessageCircle,
  Pencil,
  Trash2,
  X,
  Copy,
  CheckCircle,
  Cake,
  Ban,
  Banknote,
  Send,
  Search,
  Trophy,
  Package,
  History,
  Users,
} from "lucide-react";
import { normalizeName, normalizePhoneDigits } from "@/lib/proClientMatch";

type Appointment = {
  id: string;
  client_id?: string | null;
  client_name: string;
  client_phone: string | null;
  service: string | null;
  appointment_date: string;
  appointment_time: string;
  duration_min: number;
  price: number | null;
  status: string;
  notes: string | null;
  paid?: boolean | null;
  payment_method?: string | null;
  payment_due_date?: string | null;
  paid_at?: string | null;
  staff_id?: string | null;
  appointment_kind?: string | null;
};

type ProStaff = {
  id: string;
  name: string;
  role_label: string | null;
  active: boolean;
  sort_order?: number;
};

const FORMAS_PAGAMENTO = [
  { v: "dinheiro", l: "Dinheiro" },
  { v: "pix", l: "PIX" },
  { v: "transferencia", l: "Transferencia" },
  { v: "credito", l: "Cartao credito" },
  { v: "debito", l: "Cartao debito" },
  { v: "carteira", l: "Pagar depois (carteira)" },
] as const;

const FORMAS_RECEBIMENTO = [
  { v: "dinheiro", l: "Dinheiro" },
  { v: "pix", l: "PIX" },
  { v: "transferencia", l: "Transferencia" },
  { v: "credito", l: "Cartao credito" },
  { v: "debito", l: "Cartao debito" },
] as const;

function labelFormaPagamento(k: string) {
  const m: Record<string, string> = {
    dinheiro: "Dinheiro",
    pix: "PIX",
    transferencia: "Transferencia",
    credito: "Cartao credito",
    debito: "Cartao debito",
    carteira: "Carteira (pendente)",
    nao_info: "Nao informado",
  };
  return m[k] || k;
}

function addDaysISO(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return toISO(x);
}

type ProClient = {
  id: string;
  name: string;
  phone: string | null;
  birthday: string | null;
  notes: string | null;
  stats_total_spent?: number;
  stats_last_appointment?: string | null;
};

type HistoricoLinha = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  service: string | null;
  price: number | null;
  status: string;
  paid: boolean | null;
  paid_at?: string | null;
  payment_method?: string | null;
  notes?: string | null;
};

function isAniversarioHoje(isoBirth: string) {
  const parts = isoBirth.split("-");
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!m || !d) return false;
  const t = new Date();
  return t.getMonth() + 1 === m && t.getDate() === d;
}
type ProService = { id: string; name: string; price: number; duration_min: number; active: boolean };
type ProExpense = { id: string; description: string; amount: number; category: string; expense_date: string };
type ProCharge = { id: string; client_name: string; client_phone: string | null; description: string | null; amount: number; paid: boolean; charge_date: string };

type ProInventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_quantity: number | null;
  notes: string | null;
  updated_at?: string;
};

const INV_CATS = [
  { v: "quimica", l: "Quimica / descoloracao" },
  { v: "coloracao", l: "Coloracao" },
  { v: "tratamento", l: "Tratamento / care" },
  { v: "styling", l: "Finalizacao / styling" },
  { v: "descartavel", l: "Descartaveis" },
  { v: "utensilio", l: "Utensilios / pinceis" },
  { v: "barbearia", l: "Barbearia (lamina, aparas)" },
  { v: "outros", l: "Outros" },
];

function labelInvCat(v: string) {
  return INV_CATS.find((c) => c.v === v)?.l ?? v;
}

type ProInventoryMovimento = {
  id: string;
  order_id: string | null;
  order_ref: string | null;
  product_title: string;
  item_name: string;
  quantity_delta: number;
  created_at: string;
};

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
  bloqueio_pessoal: "border-purple-500/50 bg-purple-950/35",
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

function fmtDataBr(iso: string) {
  const p = String(iso || "").slice(0, 10);
  const [y, m, d] = p.split("-");
  if (!d || !m) return iso;
  return `${d}/${m}/${y}`;
}

function textoLembreteAgenda(a: Appointment) {
  const hora = (a.appointment_time || "").slice(0, 5);
  const svc = a.service?.trim() || "seu atendimento";
  return `Ola ${a.client_name}! Passando para lembrar do horario ${fmtDataBr(a.appointment_date)} as ${hora} — ${svc}. Nos vemos la!`;
}

function isBloqueioPessoal(a: Appointment) {
  return String(a.appointment_kind || "").toLowerCase() === "bloqueio_pessoal";
}

function labelStatusAgenda(s: string) {
  const x = (s || "").toLowerCase();
  if (x === "pendente") return "Pendente";
  if (x === "confirmado") return "Confirmado";
  if (x === "concluido") return "Concluido";
  if (x === "cancelado") return "Cancelado";
  return s;
}

/** invert: true = queda e bom (ex.: despesas) */
function pctBadge(pct: number | null | undefined, invert = false) {
  if (pct == null) return <span className="text-[9px] text-zinc-600">vs mes anterior: —</span>;
  let cor = "text-zinc-500";
  const good = invert ? pct < 0 : pct > 0;
  const bad = invert ? pct > 0 : pct < 0;
  if (good) cor = "text-emerald-400";
  if (bad) cor = "text-red-400";
  const s = pct > 0 ? "+" : "";
  return (
    <span className={`text-[9px] font-bold ${cor}`}>
      {s}
      {pct}% vs mes anterior
    </span>
  );
}

const START_MIN = 7 * 60;
const END_MIN = 21 * 60;
const SLOT = 30;
const PX = 44;

export default function AgendaGestaoPage() {
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState("");
  const [aba, setAba] = useState<"agenda" | "clientes" | "servicos" | "financeiro" | "estoque">("agenda");
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

  const [inventory, setInventory] = useState<ProInventoryItem[]>([]);
  const [inventoryMovs, setInventoryMovs] = useState<ProInventoryMovimento[]>([]);
  const [loadInv, setLoadInv] = useState(false);
  const [modalInv, setModalInv] = useState<ProInventoryItem | "new" | null>(null);
  const [formInv, setFormInv] = useState({
    name: "",
    category: "outros",
    quantity: "",
    unit: "un",
    min_quantity: "",
    notes: "",
  });

  const [modalApt, setModalApt] = useState<Appointment | "new" | null>(null);
  const [formApt, setFormApt] = useState({
    client_id: "",
    client_name: "",
    client_phone: "",
    service: "",
    appointment_time: "",
    duration_min: "60",
    price: "",
    notes: "",
    status: "confirmado",
    paid: false,
    payment_method: "pix",
    payment_due_date: "",
    paid_at: "",
    staff_id: "",
    appointment_kind: "servico" as "servico" | "bloqueio_pessoal",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [linkOk, setLinkOk] = useState(false);
  const [bookingSlug, setBookingSlug] = useState("");
  const [agendaStaffFilter, setAgendaStaffFilter] = useState<"all" | "owner" | string>("all");
  const [staffList, setStaffList] = useState<ProStaff[]>([]);
  const [modalEquipe, setModalEquipe] = useState(false);
  const [novoStaff, setNovoStaff] = useState({ name: "", role_label: "" });
  const [salvandoStaff, setSalvandoStaff] = useState(false);

  const [modalClient, setModalClient] = useState<ProClient | "new" | null>(null);
  const [formCli, setFormCli] = useState({ name: "", phone: "", birthday: "", notes: "" });
  const [buscaCliente, setBuscaCliente] = useState("");
  const [modalCliTab, setModalCliTab] = useState<"dados" | "historico">("dados");
  const [historicoCliente, setHistoricoCliente] = useState<HistoricoLinha[]>([]);
  const [loadHist, setLoadHist] = useState(false);

  const [modalSvc, setModalSvc] = useState<ProService | "new" | null>(null);
  const [formSvc, setFormSvc] = useState({ name: "", price: "", duration_min: "60" });

  const [formExp, setFormExp] = useState({ description: "", amount: "", category: "produtos", expense_date: diaStr });
  const [formChg, setFormChg] = useState({ client_name: "", client_phone: "", description: "", amount: "", charge_date: diaStr });

  const [sheetApt, setSheetApt] = useState<Appointment | null>(null);
  const [sheetWaOpen, setSheetWaOpen] = useState(false);
  const [sheetPanel, setSheetPanel] = useState<null | "concluir" | "cobranca" | "receber">(null);
  const [valorConcluir, setValorConcluir] = useState("");
  const [formaPagamentoConcluir, setFormaPagamentoConcluir] = useState<(typeof FORMAS_PAGAMENTO)[number]["v"]>("pix");
  const [dataPrevistaCarteira, setDataPrevistaCarteira] = useState("");
  const [formaRecebimentoFinal, setFormaRecebimentoFinal] = useState<(typeof FORMAS_RECEBIMENTO)[number]["v"]>("pix");
  const [dataRecebimento, setDataRecebimento] = useState(() => toISO(new Date()));
  const [formCobApt, setFormCobApt] = useState({ amount: "", description: "" });
  const [aptActionBusy, setAptActionBusy] = useState(false);

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      setUserId(session.user.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("booking_slug")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!error && data?.booking_slug && String(data.booking_slug).trim()) {
        setBookingSlug(String(data.booking_slug).trim());
      } else {
        setBookingSlug("");
      }
    });
  }, [supabase]);

  const carregarDia = useCallback(async () => {
    setLoadA(true);
    const staffQ =
      agendaStaffFilter === "all" ? "" : `&staff=${encodeURIComponent(agendaStaffFilter)}`;
    const r = await fetch(`/api/agenda?dia=${diaStr}${staffQ}`);
    const d = await r.json();
    setApts(d.appointments || []);
    setLoadA(false);
  }, [diaStr, agendaStaffFilter]);

  const carregarEquipe = useCallback(async () => {
    const r = await fetch("/api/pro/gestao/staff");
    const d = await r.json();
    if (d.ok) setStaffList(d.staff || []);
  }, []);

  async function adicionarStaff() {
    const n = novoStaff.name.trim();
    if (n.length < 2) return;
    setSalvandoStaff(true);
    const r = await fetch("/api/pro/gestao/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: n,
        role_label: novoStaff.role_label.trim() || null,
      }),
    });
    const d = await r.json();
    setSalvandoStaff(false);
    if (!d.ok) {
      alert(d.error || "Erro ao adicionar");
      return;
    }
    setNovoStaff({ name: "", role_label: "" });
    await carregarEquipe();
  }

  async function desativarStaffMember(idM: string) {
    if (!confirm("Desativar este profissional na agenda?")) return;
    const r = await fetch("/api/pro/gestao/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: idM, active: false }),
    });
    const d = await r.json();
    if (!d.ok) alert(d.error || "Erro");
    await carregarEquipe();
  }

  const carregarClientes = useCallback(async () => {
    const r = await fetch("/api/pro/gestao/clients?enrich=1");
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

  const carregarInventario = useCallback(async () => {
    setLoadInv(true);
    const r = await fetch("/api/pro/gestao/inventory");
    const d = await r.json();
    if (d.ok) {
      setInventory(d.items || []);
      setInventoryMovs(d.movements || []);
    }
    setLoadInv(false);
  }, []);

  useEffect(() => {
    if (aba === "agenda") {
      carregarClientes();
      carregarServicos();
      carregarEquipe();
    }
  }, [aba, carregarClientes, carregarServicos, carregarEquipe]);

  useEffect(() => {
    if (aba === "agenda") carregarDia();
  }, [agendaStaffFilter, aba, carregarDia, diaStr]);

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

  useEffect(() => {
    if (aba === "estoque") void carregarInventario();
  }, [aba, carregarInventario]);

  function abrirNovoApt() {
    setErr("");
    const hoje = toISO(new Date());
    let sid = "";
    if (agendaStaffFilter !== "all") {
      sid = agendaStaffFilter === "owner" ? "" : agendaStaffFilter;
    }
    setFormApt({
      client_id: "",
      client_name: "",
      client_phone: "",
      service: "",
      appointment_time: "09:00",
      duration_min: "60",
      price: "",
      notes: "",
      status: "confirmado",
      paid: false,
      payment_method: "pix",
      payment_due_date: "",
      paid_at: hoje,
      staff_id: sid,
      appointment_kind: "servico",
    });
    setModalApt("new");
  }

  function abrirEditApt(a: Appointment) {
    setErr("");
    const hoje = toISO(new Date());
    const pago = a.paid === true;
    const kind =
      String(a.appointment_kind || "").toLowerCase() === "bloqueio_pessoal" ? "bloqueio_pessoal" : "servico";
    setFormApt({
      client_id: a.client_id || "",
      client_name: a.client_name,
      client_phone: a.client_phone || "",
      service: a.service || "",
      appointment_time: a.appointment_time.slice(0, 5),
      duration_min: String(a.duration_min || 60),
      price: a.price != null ? String(a.price) : "",
      notes: a.notes || "",
      status: a.status,
      paid: pago,
      payment_method: (a.payment_method as string) || "pix",
      payment_due_date: (a.payment_due_date || "").slice(0, 10),
      paid_at: (a.paid_at || hoje).slice(0, 10),
      staff_id: a.staff_id || "",
      appointment_kind: kind,
    });
    setModalApt(a);
  }

  async function salvarApt() {
    setSaving(true);
    setErr("");
    const hoje = toISO(new Date());
    let body: Record<string, unknown>;

    const staffPayload = formApt.staff_id.trim() || null;
    const kindPayload = formApt.appointment_kind;

    if (modalApt === "new") {
      body = {
        client_name:
          kindPayload === "bloqueio_pessoal"
            ? formApt.client_name.trim() || "Compromisso pessoal"
            : formApt.client_name,
        client_phone: formApt.client_phone || null,
        service:
          kindPayload === "bloqueio_pessoal"
            ? formApt.service.trim() || "Indisponivel"
            : formApt.service || null,
        appointment_date: diaStr,
        appointment_time: formApt.appointment_time,
        duration_min: Number(formApt.duration_min) || 60,
        notes: formApt.notes || null,
        status: formApt.status,
        staff_id: staffPayload,
        appointment_kind: kindPayload,
      };
      if (kindPayload !== "bloqueio_pessoal" && formApt.client_id.trim()) {
        body.client_id = formApt.client_id.trim();
      }
      if (formApt.price.trim() !== "") body.price = Number(formApt.price.replace(",", "."));
    } else {
      const id = (modalApt as Appointment).id;
      body = {
        id,
        client_id:
          kindPayload === "bloqueio_pessoal"
            ? null
            : formApt.client_id.trim()
              ? formApt.client_id.trim()
              : null,
        client_name:
          kindPayload === "bloqueio_pessoal"
            ? formApt.client_name.trim() || "Compromisso pessoal"
            : formApt.client_name,
        client_phone: formApt.client_phone || null,
        service:
          kindPayload === "bloqueio_pessoal"
            ? formApt.service.trim() || "Indisponivel"
            : formApt.service || null,
        appointment_date: diaStr,
        appointment_time: formApt.appointment_time,
        duration_min: Number(formApt.duration_min) || 60,
        notes: formApt.notes || null,
        status: formApt.status,
        staff_id: staffPayload,
        appointment_kind: kindPayload,
      };
      if (formApt.price.trim() !== "") body.price = Number(formApt.price.replace(",", "."));
      else body.price = null;

      const st = formApt.status.toLowerCase();
      if (st === "concluido") {
        body.paid = formApt.paid;
        if (formApt.paid) {
          body.payment_method = formApt.payment_method || "pix";
          body.paid_at = formApt.paid_at || hoje;
          body.payment_due_date = null;
        } else {
          body.payment_method = "carteira";
          body.paid_at = null;
          body.payment_due_date = formApt.payment_due_date || null;
        }
      } else {
        body.paid = false;
        body.payment_method = null;
        body.paid_at = null;
        body.payment_due_date = null;
      }
    }

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
    setSheetApt(null);
    setSheetPanel(null);
  }

  function abrirSheetApt(a: Appointment) {
    setSheetApt(a);
    setSheetWaOpen(false);
    setSheetPanel(null);
    setValorConcluir(a.price != null && a.price !== 0 ? String(a.price) : "");
    setFormaPagamentoConcluir("pix");
    setDataPrevistaCarteira(addDaysISO(dia, 7));
    setFormaRecebimentoFinal("pix");
    setDataRecebimento(toISO(new Date()));
    setFormCobApt({
      amount: a.price != null ? String(a.price) : "",
      description: a.service || "Agendamento",
    });
  }

  async function patchAgendamento(id: string, campos: Record<string, unknown>) {
    setAptActionBusy(true);
    const r = await fetch("/api/agenda", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...campos }),
    });
    const d = await r.json();
    setAptActionBusy(false);
    if (!d.ok) {
      alert(d.error || "Nao foi possivel atualizar");
      return;
    }
    carregarDia();
    setSheetApt(null);
    setSheetPanel(null);
    setSheetWaOpen(false);
  }

  function irEditarDoSheet(a: Appointment) {
    setSheetApt(null);
    setSheetPanel(null);
    abrirEditApt(a);
  }

  async function confirmarConcluir(a: Appointment) {
    const body: Record<string, unknown> = { status: "concluido" };
    const t = valorConcluir.trim().replace(",", ".");
    if (t !== "") {
      const n = Number(t);
      if (!Number.isFinite(n) || n < 0) {
        alert("Valor invalido");
        return;
      }
      body.price = n;
    }
    if (formaPagamentoConcluir === "carteira") {
      if (!dataPrevistaCarteira.trim()) {
        alert("Informe a data prevista de pagamento (carteira).");
        return;
      }
      body.paid = false;
      body.payment_method = "carteira";
      body.payment_due_date = dataPrevistaCarteira;
      body.paid_at = null;
    } else {
      body.paid = true;
      body.payment_method = formaPagamentoConcluir;
      body.paid_at = toISO(new Date());
      body.payment_due_date = null;
    }
    await patchAgendamento(a.id, body);
  }

  async function confirmarRecebimentoCarteira(a: Appointment) {
    if (!dataRecebimento.trim()) {
      alert("Informe a data em que o pagamento foi recebido.");
      return;
    }
    await patchAgendamento(a.id, {
      paid: true,
      payment_method: formaRecebimentoFinal,
      paid_at: dataRecebimento,
      payment_due_date: null,
    });
  }

  async function registrarCobrancaDoSheet(a: Appointment) {
    const t = formCobApt.amount.trim().replace(",", ".");
    if (!t) {
      alert("Informe o valor");
      return;
    }
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) {
      alert("Valor invalido");
      return;
    }
    setAptActionBusy(true);
    const r = await fetch("/api/pro/gestao/charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: a.client_name,
        client_phone: a.client_phone || "",
        description: formCobApt.description || a.service || "Agendamento",
        amount: n,
        charge_date: a.appointment_date || diaStr,
      }),
    });
    const d = await r.json();
    setAptActionBusy(false);
    if (!d.ok) {
      alert(d.error || "Erro ao registrar cobranca");
      return;
    }
    carregarDia();
    setSheetApt(null);
    setSheetPanel(null);
  }

  async function cancelarAgendamento(a: Appointment) {
    if (!confirm("Cancelar este agendamento? O horario ficara livre.")) return;
    await patchAgendamento(a.id, { status: "cancelado" });
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

  async function salvarItemEstoque() {
    if (!formInv.name.trim()) return;
    setSaving(true);
    const body = {
      name: formInv.name.trim(),
      category: formInv.category,
      quantity: formInv.quantity === "" ? 0 : Number(formInv.quantity),
      unit: formInv.unit.trim() || "un",
      min_quantity: formInv.min_quantity === "" ? null : Number(formInv.min_quantity),
      notes: formInv.notes.trim() || null,
    };
    if (modalInv === "new") {
      await fetch("/api/pro/gestao/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else if (modalInv) {
      await fetch("/api/pro/gestao/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: (modalInv as ProInventoryItem).id, ...body }),
      });
    }
    setModalInv(null);
    await carregarInventario();
    setSaving(false);
  }

  async function excluirItemEstoque(id: string) {
    if (!confirm("Excluir este item do estoque?")) return;
    await fetch("/api/pro/gestao/inventory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await carregarInventario();
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
    agora.setHours(0, 0, 0, 0);
    const lim = new Date(agora);
    lim.setDate(lim.getDate() + 14);
    return clients.filter((c) => {
      if (!c.birthday) return false;
      const [, m, day] = c.birthday.split("-").map(Number);
      if (!m || !day) return false;
      const bThisYear = new Date(agora.getFullYear(), m - 1, day);
      const bNext = new Date(agora.getFullYear() + 1, m - 1, day);
      let b = bThisYear;
      if (bThisYear < agora) b = bNext;
      b.setHours(0, 0, 0, 0);
      return b >= agora && b <= lim;
    });
  }, [clients]);

  const clientesFiltrados = useMemo(() => {
    const q = buscaCliente.trim().toLowerCase();
    const dig = q.replace(/\D/g, "");
    if (!q && !dig) return clients;
    return clients.filter((c) => {
      if (q && normalizeName(c.name).includes(q)) return true;
      if (dig.length >= 2) {
        const p = normalizePhoneDigits(c.phone || "");
        if (p.includes(dig)) return true;
      }
      return false;
    });
  }, [clients, buscaCliente]);

  const rankingClientesReceita = useMemo(() => {
    return [...clients]
      .filter((c) => (c.stats_total_spent ?? 0) > 0)
      .sort((a, b) => (b.stats_total_spent ?? 0) - (a.stats_total_spent ?? 0))
      .slice(0, 10);
  }, [clients]);

  const inventarioBaixo = useMemo(
    () =>
      inventory.filter(
        (it) =>
          it.min_quantity != null && Number(it.quantity) <= Number(it.min_quantity)
      ),
    [inventory]
  );

  async function abrirClienteModal(c: ProClient) {
    setModalCliTab("dados");
    setFormCli({
      name: c.name,
      phone: c.phone || "",
      birthday: c.birthday || "",
      notes: c.notes || "",
    });
    setModalClient(c);
    setHistoricoCliente([]);
    setLoadHist(true);
    try {
      const r = await fetch(`/api/pro/gestao/clients/history?clientId=${encodeURIComponent(c.id)}`);
      const d = await r.json();
      if (d.ok) setHistoricoCliente(d.history || []);
    } finally {
      setLoadHist(false);
    }
  }

  async function excluirServicoGestao(s: ProService) {
    if (!confirm(`Excluir o servico "${s.name}"?`)) return;
    await fetch("/api/pro/gestao/services", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id }),
    });
    carregarServicos();
  }

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
      client_id: c.id,
      client_name: c.name,
      client_phone: c.phone || "",
    }));
  }

  function desvincularClienteApt() {
    setFormApt((f) => ({ ...f, client_id: "" }));
  }

  function aoMudarNomeClienteApt(value: string) {
    setFormApt((f) => {
      const next = { ...f, client_name: value };
      if (!f.client_id) return next;
      const c = clients.find((x) => x.id === f.client_id);
      if (!c) return { ...next, client_id: "" };
      if (normalizeName(c.name) !== normalizeName(value)) return { ...next, client_id: "" };
      return next;
    });
  }

  function aoMudarTelefoneClienteApt(value: string) {
    setFormApt((f) => {
      const next = { ...f, client_phone: value };
      if (!f.client_id) return next;
      const c = clients.find((x) => x.id === f.client_id);
      if (!c) return { ...next, client_id: "" };
      if (normalizePhoneDigits(c.phone || "") !== normalizePhoneDigits(value)) return { ...next, client_id: "" };
      return next;
    });
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
    const seg = bookingSlug.trim() || userId;
    const u = `${window.location.origin}/agendar/${seg}`;
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
            Agenda, clientes, servicos, financeiro e estoque do salao
          </p>
        </div>
        {userId && (
          <div className="flex flex-col items-stretch sm:items-end gap-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={copiarLink}
              className="flex items-center justify-center gap-2 text-xs font-black uppercase bg-zinc-900 border border-zinc-700 text-[#C9A66B] px-4 py-2 rounded-xl"
            >
              {linkOk ? <CheckCircle size={14} /> : <Copy size={14} />}
              {linkOk ? "Copiado!" : "Link publico agendar"}
            </button>
            <p
              className="text-[10px] text-zinc-500 font-mono truncate text-center sm:text-right max-w-full"
              title={`${typeof window !== "undefined" ? window.location.origin : ""}/agendar/${bookingSlug.trim() || userId}`}
            >
              /agendar/{bookingSlug.trim() || userId}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ["agenda", "Agenda"],
            ["clientes", "Clientes"],
            ["servicos", "Servicos"],
            ["financeiro", "Financeiro"],
            ["estoque", "Estoque"],
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

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[9px] font-black uppercase text-zinc-500 shrink-0">Visao</span>
            <button
              type="button"
              onClick={() => setAgendaStaffFilter("all")}
              className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border ${
                agendaStaffFilter === "all"
                  ? "bg-[#C9A66B]/20 border-[#C9A66B] text-[#C9A66B]"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
              }`}
            >
              Salao (todos)
            </button>
            <button
              type="button"
              onClick={() => setAgendaStaffFilter("owner")}
              className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border ${
                agendaStaffFilter === "owner"
                  ? "bg-[#C9A66B]/20 border-[#C9A66B] text-[#C9A66B]"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
              }`}
            >
              Responsavel
            </button>
            {staffList
              .filter((s) => s.active)
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setAgendaStaffFilter(s.id)}
                  className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border max-w-[140px] truncate ${
                    agendaStaffFilter === s.id
                      ? "bg-[#C9A66B]/20 border-[#C9A66B] text-[#C9A66B]"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}
                  title={s.role_label || s.name}
                >
                  {s.name}
                </button>
              ))}
            <button
              type="button"
              onClick={() => setModalEquipe(true)}
              className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 flex items-center gap-1 sm:ml-auto"
            >
              <Users size={12} /> Equipe
            </button>
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
                  const bloqueio = isBloqueioPessoal(a);
                  const st = bloqueio ? STATUS_STYLE.bloqueio_pessoal : STATUS_STYLE[a.status] || STATUS_STYLE.confirmado;
                  const staffNm = a.staff_id ? staffList.find((x) => x.id === a.staff_id)?.name : null;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => abrirSheetApt(a)}
                      className={`absolute left-1 right-1 rounded-xl border px-2 py-1 text-left overflow-hidden ${st}`}
                      style={{ top, height: Math.max(h, 36) }}
                    >
                      <p className="text-[10px] font-black text-white truncate flex items-center gap-1">
                        {a.client_id && !bloqueio ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Cliente vinculado" />
                        ) : null}
                        {a.appointment_time.slice(0, 5)} · {bloqueio ? "Pessoal" : a.client_name}
                      </p>
                      <p className="text-[9px] text-zinc-400 truncate">
                        {bloqueio ? "Bloqueio na agenda" : a.service || "Servico"}
                        {staffNm ? ` · ${staffNm}` : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-3 text-[9px] font-bold uppercase text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600/80 border border-blue-400/50" /> Confirmado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-400/50" /> Pendente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600/80 border border-emerald-400/50" /> Concluido
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 border border-zinc-500/50" /> Cancelado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600/80 border border-purple-400/50" /> Bloqueio pessoal
            </span>
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
              <p className="text-xs font-black uppercase text-pink-300 flex items-center gap-2 mb-3">
                <Cake size={14} /> Aniversarios (proximos 14 dias)
              </p>
              <div className="flex flex-col gap-2">
                {aniversariantes.map((c) => {
                  const hoje = c.birthday ? isAniversarioHoje(c.birthday) : false;
                  return (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center gap-2 justify-between bg-zinc-900/80 rounded-xl px-3 py-2 border border-zinc-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold text-white truncate">{c.name}</span>
                        {hoje && (
                          <span className="text-[9px] font-black uppercase bg-pink-600 text-white px-2 py-0.5 rounded-full shrink-0">
                            Hoje!
                          </span>
                        )}
                      </div>
                      {c.phone?.replace(/\D/g, "") ? (
                        <a
                          href={waLink(c.phone!, `Ola ${c.name}! Feliz aniversario!`)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 shrink-0 px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/50"
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {rankingClientesReceita.length > 0 && (
            <div className="rounded-2xl border border-[#C9A66B]/30 bg-[#C9A66B]/5 p-4">
              <p className="text-xs font-black uppercase text-[#C9A66B] flex items-center gap-2 mb-3">
                <Trophy size={14} /> Ranking por receita (historico pago)
              </p>
              <ol className="space-y-2">
                {rankingClientesReceita.map((c, i) => (
                  <li key={c.id} className="flex justify-between text-sm gap-2">
                    <span className="text-zinc-300 truncate">
                      {i + 1}. {c.name}
                    </span>
                    <span className="text-white font-black shrink-0">{fmtMoney(c.stats_total_spent ?? 0)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="search"
              placeholder="Buscar por nome ou telefone..."
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder:text-zinc-600"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setModalCliTab("dados");
              setHistoricoCliente([]);
              setFormCli({ name: "", phone: "", birthday: "", notes: "" });
              setModalClient("new");
            }}
            className="w-full py-3 rounded-xl bg-[#C9A66B] text-black font-black uppercase text-xs"
          >
            + Novo cliente
          </button>
          <div className="space-y-2">
            {clientesFiltrados.length === 0 && (
              <p className="text-center text-zinc-500 text-sm py-6">Nenhum cliente encontrado.</p>
            )}
            {clientesFiltrados.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => void abrirClienteModal(c)}
                className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-600 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-white">{c.name}</span>
                  {c.phone && <span className="text-xs text-zinc-500 shrink-0">{c.phone}</span>}
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-bold uppercase text-zinc-500">
                  <span className="text-emerald-400/90">Total: {fmtMoney(c.stats_total_spent ?? 0)}</span>
                  <span>
                    Ultimo:{" "}
                    {c.stats_last_appointment ? fmtDataBr(c.stats_last_appointment) : "—"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SERVICOS */}
      {aba === "servicos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["Corte masculino", "Barba", "Degrade", "Sobrancelha", "Pezinho", "Pigmentacao"].map((chip) => (
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
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex justify-between items-center gap-2"
            >
              <div className="min-w-0">
                <p className="font-bold text-white truncate">{s.name}</p>
                <p className="text-xs text-zinc-500">
                  {fmtMoney(Number(s.price))} · {s.duration_min} min
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
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
                  className="p-2 text-zinc-400 hover:text-[#C9A66B]"
                  aria-label="Editar servico"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => void excluirServicoGestao(s)}
                  className="p-2 text-zinc-500 hover:text-red-400"
                  aria-label="Excluir servico"
                >
                  <Trash2 size={16} />
                </button>
              </div>
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
                <p className="text-[10px] font-black uppercase text-emerald-400">Receita (paga)</p>
                <p className="text-2xl font-black text-white">{fmtMoney(fin.resumo.receita)}</p>
                <div className="mt-2">{pctBadge(fin.comparativo?.receita_pct, false)}</div>
                <p className="text-[9px] text-zinc-600 mt-2 leading-snug">
                  So entra no mes pela data em que o pagamento foi recebido (nao pelo dia do corte).
                </p>
              </div>
              <div className="rounded-2xl border border-red-800/40 bg-red-950/20 p-4">
                <p className="text-[10px] font-black uppercase text-red-400">Despesas</p>
                <p className="text-2xl font-black text-white">{fmtMoney(fin.resumo.despesas)}</p>
                <div className="mt-2">{pctBadge(fin.comparativo?.despesas_pct, true)}</div>
              </div>
              <div className="rounded-2xl border border-[#C9A66B]/40 bg-[#C9A66B]/10 p-4">
                <p className="text-[10px] font-black uppercase text-[#C9A66B]">Lucro</p>
                <p className="text-2xl font-black text-white">{fmtMoney(fin.resumo.lucro)}</p>
                <div className="mt-2">{pctBadge(fin.comparativo?.lucro_pct, false)}</div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Cobrancas em aberto: {fmtMoney(fin.resumo.a_receber)}
                </p>
                {typeof fin.resumo.a_receber_carteira === "number" && fin.resumo.a_receber_carteira > 0 && (
                  <p className="text-[10px] text-amber-400/90 mt-1 font-bold">
                    Carteira (pagar depois): {fmtMoney(fin.resumo.a_receber_carteira)}
                  </p>
                )}
              </div>
            </div>
          )}

          {finSub === "resumo" && fin?.porFormaPagamento?.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 p-4">
              <p className="text-xs font-black uppercase text-zinc-400 mb-2">
                Receita por forma (dinheiro, pix, cartoes, transferencia)
              </p>
              {fin.porFormaPagamento.map((row: { key: string; total: number }) => (
                <div key={row.key} className="flex justify-between text-sm py-1 border-b border-zinc-800/50">
                  <span className="text-zinc-300">{labelFormaPagamento(row.key)}</span>
                  <span className="text-emerald-300 font-bold">{fmtMoney(row.total)}</span>
                </div>
              ))}
            </div>
          )}

          {finSub === "resumo" && fin?.carteiraPendente?.length > 0 && (
            <div className="rounded-2xl border border-amber-900/40 bg-amber-950/10 p-4">
              <p className="text-xs font-black uppercase text-amber-400 mb-2">Carteira — a receber</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {fin.carteiraPendente.map(
                  (row: {
                    id: string;
                    client_name?: string;
                    price?: number;
                    payment_due_date?: string;
                    appointment_date?: string;
                    service?: string;
                  }) => (
                    <div key={row.id} className="flex justify-between text-xs gap-2 border-b border-zinc-800/40 pb-2">
                      <div>
                        <p className="text-white font-bold">{row.client_name}</p>
                        <p className="text-zinc-500">
                          {row.service || "—"}
                          {row.payment_due_date ? ` · ate ${fmtDataBr(row.payment_due_date)}` : ""}
                        </p>
                      </div>
                      <span className="text-amber-300 font-black shrink-0">{fmtMoney(Number(row.price || 0))}</span>
                    </div>
                  )
                )}
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
              <p className="text-xs font-black uppercase text-zinc-400 mb-2">Top 5 servicos por faturamento</p>
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
                  <span
                    className={
                      row.resultado >= 0 ? "text-emerald-300 font-bold" : "text-red-400 font-black"
                    }
                  >
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
                            className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide"
                          >
                            Marcar como pago
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

      {/* ESTOQUE (salao — produtos e materiais) */}
      {aba === "estoque" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#C9A66B]/30 bg-[#C9A66B]/5 p-4">
            <p className="text-xs font-black uppercase text-[#C9A66B] flex items-center gap-2 mb-1">
              <Package size={14} /> Estoque do espaco
            </p>
            <p className="text-[11px] text-zinc-500 leading-snug">
              Controle produtos quimicos, descartaveis, pinceis e materiais de barbearia. Defina um minimo para destacar o que precisa repor. Ao confirmar recebimento de pedidos da loja MascPRO, as quantidades entram aqui e aparecem no historico abaixo.
            </p>
          </div>

          {!loadInv && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-black uppercase text-cyan-500/90 flex items-center gap-2 mb-2">
                <History size={14} /> Origem — entradas pela loja
              </p>
              <p className="text-[10px] text-zinc-600 mb-3 leading-snug">
                Registro somente leitura: cada linha mostra o pedido que creditou itens no seu estoque quando voce marcou o pedido como entregue. Passe o mouse em &quot;Pedido&quot; para ver o ID completo.
              </p>
              {inventoryMovs.length === 0 ? (
                <p className="text-zinc-500 text-xs">
                  Ainda nao ha entradas automaticas pela loja. Quando houver, elas aparecem aqui (e no admin, Gestao PRO Master).
                </p>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-2">
                  {inventoryMovs.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-zinc-800/90 bg-black/25 px-3 py-2 text-[11px]"
                    >
                      <p className="font-bold text-white">
                        +{row.quantity_delta}{" "}
                        <span className="text-zinc-500 font-normal">·</span>{" "}
                        <span className="text-zinc-300">{row.product_title}</span>
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">No estoque: {row.item_name}</p>
                      {row.order_id ? (
                        <p className="text-[10px] text-cyan-600/90 mt-1 font-mono" title={row.order_id}>
                          Pedido {row.order_ref}
                        </p>
                      ) : null}
                      <p className="text-[9px] text-zinc-600 mt-1">
                        {new Date(row.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {inventarioBaixo.length > 0 && (
            <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4">
              <p className="text-[10px] font-black uppercase text-amber-400 mb-2">Abaixo do minimo — repor</p>
              <ul className="space-y-1 text-sm text-zinc-200">
                {inventarioBaixo.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span className="font-bold truncate">{it.name}</span>
                    <span className="text-amber-300 shrink-0 font-black">
                      {Number(it.quantity)} / min {Number(it.min_quantity)} {it.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setFormInv({
                name: "",
                category: "outros",
                quantity: "",
                unit: "un",
                min_quantity: "",
                notes: "",
              });
              setModalInv("new");
            }}
            className="w-full py-3 rounded-xl bg-[#C9A66B] text-black font-black uppercase text-xs"
          >
            + Novo item
          </button>

          {loadInv ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-[#C9A66B]" />
            </div>
          ) : inventory.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-8">
              Nenhum item cadastrado. Adicione tintas, neutralizantes, luvas, toalhas, laminas, etc.
            </p>
          ) : (
            <div className="space-y-2">
              {inventory.map((it) => {
                const alerta =
                  it.min_quantity != null && Number(it.quantity) <= Number(it.min_quantity);
                return (
                  <div
                    key={it.id}
                    className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      alerta ? "border-amber-600/50 bg-amber-950/15" : "border-zinc-800 bg-zinc-900/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{it.name}</p>
                      <p className="text-[10px] text-zinc-500 uppercase mt-0.5">{labelInvCat(it.category)}</p>
                      {it.notes ? <p className="text-[10px] text-zinc-600 mt-1 line-clamp-2">{it.notes}</p> : null}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`text-lg font-black ${alerta ? "text-amber-400" : "text-emerald-400"}`}>
                          {Number(it.quantity)} <span className="text-xs text-zinc-500 font-bold">{it.unit}</span>
                        </p>
                        {it.min_quantity != null && (
                          <p className="text-[9px] text-zinc-600">Min: {Number(it.min_quantity)}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormInv({
                            name: it.name,
                            category: it.category || "outros",
                            quantity: String(it.quantity),
                            unit: it.unit || "un",
                            min_quantity: it.min_quantity != null ? String(it.min_quantity) : "",
                            notes: it.notes || "",
                          });
                          setModalInv(it);
                        }}
                        className="p-2 text-zinc-400 hover:text-[#C9A66B]"
                        aria-label="Editar item"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void excluirItemEstoque(it.id)}
                        className="p-2 text-zinc-500 hover:text-red-400"
                        aria-label="Excluir item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SHEET ACOES DO AGENDAMENTO */}
      {sheetApt && (
        <div
          className="fixed inset-0 z-[280] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
          onClick={() => {
            if (aptActionBusy) return;
            setSheetApt(null);
            setSheetPanel(null);
            setSheetWaOpen(false);
          }}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[88vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sheetPanel === null && (
              <>
                <div className="p-4 border-b border-zinc-800">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-lg font-black text-white leading-tight flex items-center gap-2 flex-wrap">
                        {isBloqueioPessoal(sheetApt) ? (
                          <span className="text-purple-200">Bloqueio pessoal</span>
                        ) : (
                          sheetApt.client_name
                        )}
                        {!isBloqueioPessoal(sheetApt) && sheetApt.client_id ? (
                          <span className="text-[9px] font-black uppercase text-emerald-500 border border-emerald-700/50 rounded-full px-2 py-0.5">
                            Cadastro PRO
                          </span>
                        ) : null}
                      </p>
                      {sheetApt.staff_id ? (
                        <p className="text-[10px] text-[#C9A66B]/90 font-bold mt-1">
                          Profissional: {staffList.find((x) => x.id === sheetApt.staff_id)?.name || "—"}
                        </p>
                      ) : staffList.length > 0 ? (
                        <p className="text-[10px] text-zinc-500 mt-1">Responsavel (dono)</p>
                      ) : null}
                      <p className="text-xs text-zinc-500 mt-1">
                        {(sheetApt.appointment_time || "").slice(0, 5)} · {fmtDataBr(sheetApt.appointment_date)}
                        {sheetApt.service ? ` · ${sheetApt.service}` : ""}
                      </p>
                      <p className="text-[10px] font-black uppercase text-[#C9A66B] mt-2">
                        {labelStatusAgenda(sheetApt.status)}
                      </p>
                      {sheetApt.paid === true && (
                        <p className="text-[10px] text-emerald-400 font-bold mt-1">
                          Pago · {labelFormaPagamento(String(sheetApt.payment_method || "nao_info"))}
                          {sheetApt.paid_at
                            ? ` em ${fmtDataBr(sheetApt.paid_at)}`
                            : ""}
                        </p>
                      )}
                      {sheetApt.status === "concluido" &&
                        sheetApt.paid !== true &&
                        sheetApt.payment_method === "carteira" &&
                        sheetApt.payment_due_date && (
                          <p className="text-[10px] text-amber-400 font-bold mt-1">
                            Pagar ate {fmtDataBr(sheetApt.payment_due_date)} (carteira)
                          </p>
                        )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSheetApt(null);
                        setSheetPanel(null);
                      }}
                      className="p-2 text-zinc-500"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-3 space-y-2 border-b border-zinc-800/80">
                  {!isBloqueioPessoal(sheetApt) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSheetWaOpen((v) => !v)}
                        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left"
                      >
                        <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-2">
                          <MessageCircle size={16} /> WhatsApp
                        </span>
                        <ChevronDown size={16} className={`text-zinc-500 transition ${sheetWaOpen ? "rotate-180" : ""}`} />
                      </button>
                      {sheetWaOpen && (
                        <div className="space-y-2 pl-1">
                          {!sheetApt.client_phone?.replace(/\D/g, "") ? (
                            <p className="text-[10px] text-zinc-500 px-2">
                              Cadastre o telefone do cliente para usar o WhatsApp.
                            </p>
                          ) : (
                            <>
                          <a
                            href={waLink(sheetApt.client_phone!, `Ola ${sheetApt.client_name}!`)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs font-bold text-white py-2 px-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50"
                          >
                            <MessageCircle size={14} /> Abrir conversa
                          </a>
                          <a
                            href={waLink(sheetApt.client_phone!, textoLembreteAgenda(sheetApt))}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs font-bold text-zinc-200 py-2 px-3 rounded-xl bg-zinc-900 border border-zinc-700"
                          >
                            <Send size={14} /> Enviar lembrete
                          </a>
                          <a
                            href={waLink(
                              sheetApt.client_phone!,
                              `Ola ${sheetApt.client_name}! Tudo certo com seu horario? Precisa remarcar?`
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-zinc-300 py-2 px-3 rounded-xl bg-zinc-900/80 border border-zinc-800"
                          >
                            Msg: confirmar remarcacao
                          </a>
                          <a
                            href={waLink(
                              sheetApt.client_phone!,
                              `Ola ${sheetApt.client_name}! Obrigado pela preferencia. Volte sempre!`
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-zinc-300 py-2 px-3 rounded-xl bg-zinc-900/80 border border-zinc-800"
                          >
                            Msg: pos-atendimento
                          </a>
                        </>
                      )}
                    </div>
                  )}
                    </>
                  )}
                </div>

                <div className="p-3 grid grid-cols-1 gap-2">
                  {sheetApt.status === "concluido" && sheetApt.paid !== true && (
                    <button
                      type="button"
                      disabled={aptActionBusy}
                      onClick={() => {
                        setDataRecebimento(toISO(new Date()));
                        setFormaRecebimentoFinal("pix");
                        setSheetPanel("receber");
                      }}
                      className="w-full py-3 rounded-xl bg-emerald-900/40 border border-emerald-600/50 text-emerald-300 text-xs font-black uppercase"
                    >
                      Registrar pagamento recebido
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={aptActionBusy}
                    onClick={() => irEditarDoSheet(sheetApt)}
                    className="w-full py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-xs font-black uppercase flex items-center justify-center gap-2"
                  >
                    <Pencil size={16} /> Editar
                  </button>
                  {sheetApt.status !== "concluido" &&
                    sheetApt.status !== "cancelado" &&
                    !isBloqueioPessoal(sheetApt) && (
                    <>
                      <button
                        type="button"
                        disabled={aptActionBusy}
                        onClick={() => {
                          setValorConcluir(
                            sheetApt.price != null && sheetApt.price !== 0 ? String(sheetApt.price) : ""
                          );
                          setFormaPagamentoConcluir("pix");
                          setDataPrevistaCarteira(addDaysISO(dia, 7));
                          setSheetPanel("concluir");
                        }}
                        className="w-full py-3 rounded-xl bg-emerald-950/50 border border-emerald-700/50 text-emerald-300 text-xs font-black uppercase flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={16} /> Concluir e registrar valor
                      </button>
                      <button
                        type="button"
                        disabled={aptActionBusy}
                        onClick={() => setSheetPanel("cobranca")}
                        className="w-full py-3 rounded-xl bg-amber-950/30 border border-amber-700/40 text-amber-200 text-xs font-black uppercase flex items-center justify-center gap-2"
                      >
                        <Banknote size={16} /> Adicionar cobranca
                      </button>
                      <button
                        type="button"
                        disabled={aptActionBusy}
                        onClick={() => cancelarAgendamento(sheetApt)}
                        className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs font-black uppercase flex items-center justify-center gap-2"
                      >
                        <Ban size={16} /> Cancelar agendamento
                      </button>
                    </>
                  )}
                  {sheetApt.status !== "concluido" &&
                    sheetApt.status !== "cancelado" &&
                    isBloqueioPessoal(sheetApt) && (
                      <button
                        type="button"
                        disabled={aptActionBusy}
                        onClick={() => cancelarAgendamento(sheetApt)}
                        className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs font-black uppercase flex items-center justify-center gap-2"
                      >
                        <Ban size={16} /> Cancelar bloqueio
                      </button>
                    )}
                  <button
                    type="button"
                    disabled={aptActionBusy}
                    onClick={() => excluirApt(sheetApt.id)}
                    className="w-full py-2 text-red-400 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Trash2 size={14} /> Excluir definitivamente
                  </button>
                </div>
              </>
            )}

            {sheetPanel === "concluir" && sheetApt && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black uppercase text-sm text-white">Concluir atendimento</h3>
                  <button
                    type="button"
                    onClick={() => setSheetPanel(null)}
                    className="p-2 text-zinc-500"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Confirme o valor (vazio = mantem o valor ja cadastrado). Escolha como foi pago: PIX, cartoes ou
                  carteira (pagar depois).
                </p>
                <input
                  placeholder="Valor R$"
                  type="text"
                  inputMode="decimal"
                  value={valorConcluir}
                  onChange={(e) => setValorConcluir(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white"
                />
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Forma de pagamento</p>
                  <select
                    value={formaPagamentoConcluir}
                    onChange={(e) =>
                      setFormaPagamentoConcluir(e.target.value as (typeof FORMAS_PAGAMENTO)[number]["v"])
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                  >
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f.v} value={f.v}>
                        {f.l}
                      </option>
                    ))}
                  </select>
                </div>
                {formaPagamentoConcluir === "carteira" && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Previsao de pagamento</p>
                    <input
                      type="date"
                      value={dataPrevistaCarteira}
                      onChange={(e) => setDataPrevistaCarteira(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                      style={{ colorScheme: "dark" }}
                    />
                    <p className="text-[9px] text-zinc-600 mt-1">
                      Nao entra na receita ate voce registrar o recebimento.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  disabled={aptActionBusy}
                  onClick={() => confirmarConcluir(sheetApt)}
                  className="w-full py-3 rounded-xl bg-[#C9A66B] text-black font-black text-xs uppercase"
                >
                  {aptActionBusy ? "Salvando..." : "Marcar como concluido"}
                </button>
              </div>
            )}

            {sheetPanel === "receber" && sheetApt && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black uppercase text-sm text-white">Pagamento recebido</h3>
                  <button
                    type="button"
                    onClick={() => setSheetPanel(null)}
                    className="p-2 text-zinc-500"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="text-xs text-zinc-400">{sheetApt.client_name}</p>
                <p className="text-[10px] text-zinc-500">
                  Informe o dia em que o dinheiro entrou e a forma final (PIX ou cartao).
                </p>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Forma de pagamento</p>
                  <select
                    value={formaRecebimentoFinal}
                    onChange={(e) =>
                      setFormaRecebimentoFinal(e.target.value as (typeof FORMAS_RECEBIMENTO)[number]["v"])
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                  >
                    {FORMAS_RECEBIMENTO.map((f) => (
                      <option key={f.v} value={f.v}>
                        {f.l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Data do recebimento</p>
                  <input
                    type="date"
                    value={dataRecebimento}
                    onChange={(e) => setDataRecebimento(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                <button
                  type="button"
                  disabled={aptActionBusy}
                  onClick={() => confirmarRecebimentoCarteira(sheetApt)}
                  className="w-full py-3 rounded-xl bg-[#C9A66B] text-black font-black text-xs uppercase"
                >
                  {aptActionBusy ? "Salvando..." : "Confirmar recebimento"}
                </button>
              </div>
            )}

            {sheetPanel === "cobranca" && sheetApt && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black uppercase text-sm text-white">Nova cobranca</h3>
                  <button
                    type="button"
                    onClick={() => setSheetPanel(null)}
                    className="p-2 text-zinc-500"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="text-xs text-zinc-400">{sheetApt.client_name}</p>
                <input
                  placeholder="Valor R$"
                  type="text"
                  inputMode="decimal"
                  value={formCobApt.amount}
                  onChange={(e) => setFormCobApt({ ...formCobApt, amount: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  placeholder="Descricao / servicos"
                  value={formCobApt.description}
                  onChange={(e) => setFormCobApt({ ...formCobApt, description: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={aptActionBusy}
                  onClick={() => registrarCobrancaDoSheet(sheetApt)}
                  className="w-full py-3 rounded-xl bg-[#C9A66B] text-black font-black text-xs uppercase"
                >
                  {aptActionBusy ? "Registrando..." : "Registrar cobranca"}
                </button>
              </div>
            )}
          </div>
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
              {staffList.filter((s) => s.active).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Profissional</p>
                  <select
                    value={formApt.staff_id}
                    onChange={(e) => setFormApt({ ...formApt, staff_id: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="">Responsavel (dono)</option>
                    {staffList
                      .filter((s) => s.active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.role_label ? ` — ${s.role_label}` : ""}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <label className="flex items-start gap-2 text-[11px] text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formApt.appointment_kind === "bloqueio_pessoal"}
                  onChange={(e) =>
                    setFormApt({
                      ...formApt,
                      appointment_kind: e.target.checked ? "bloqueio_pessoal" : "servico",
                      service: e.target.checked
                        ? formApt.service.trim() || "Indisponivel"
                        : formApt.service,
                      status: e.target.checked ? "confirmado" : formApt.status,
                    })
                  }
                  className="rounded border-zinc-600 mt-0.5"
                />
                <span>Bloqueio pessoal — fecha o horario no link publico para este profissional</span>
              </label>
              {formApt.client_id && formApt.appointment_kind !== "bloqueio_pessoal" ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-3 py-2">
                  <p className="text-[10px] font-black uppercase text-emerald-400">
                    Vinculado ao cadastro PRO
                  </p>
                  <button
                    type="button"
                    onClick={desvincularClienteApt}
                    className="text-[9px] font-bold uppercase text-zinc-400 hover:text-white"
                  >
                    Desvincular
                  </button>
                </div>
              ) : null}
              {formApt.appointment_kind !== "bloqueio_pessoal" && clients.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Escolher cliente (preenche e amarra ao cadastro)
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => aplicarCliente(c)}
                        className={`text-[10px] px-2 py-1 rounded-lg border ${
                          formApt.client_id === c.id
                            ? "bg-[#C9A66B]/20 border-[#C9A66B] text-[#C9A66B]"
                            : "bg-zinc-800 border-zinc-700 text-[#C9A66B]"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <input
                placeholder={
                  formApt.appointment_kind === "bloqueio_pessoal"
                    ? "Titulo (ex.: Almoco, Terapia)"
                    : "Nome do cliente"
                }
                value={formApt.client_name}
                onChange={(e) => aoMudarNomeClienteApt(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              />
              {formApt.appointment_kind !== "bloqueio_pessoal" && (
                <input
                  placeholder="WhatsApp"
                  value={formApt.client_phone}
                  onChange={(e) => aoMudarTelefoneClienteApt(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
              )}
              {formApt.appointment_kind !== "bloqueio_pessoal" && services.length > 0 && (
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
              {formApt.status === "concluido" && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-3">
                  <p className="text-[10px] font-black uppercase text-[#C9A66B]">Pagamento e financeiro</p>
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formApt.paid}
                      onChange={(e) =>
                        setFormApt({
                          ...formApt,
                          paid: e.target.checked,
                          payment_method: e.target.checked ? formApt.payment_method || "pix" : "carteira",
                        })
                      }
                      className="rounded border-zinc-600"
                    />
                    Pagamento ja recebido (entra na receita)
                  </label>
                  {formApt.paid ? (
                    <>
                      <select
                        value={FORMAS_RECEBIMENTO.some((x) => x.v === formApt.payment_method) ? formApt.payment_method : "pix"}
                        onChange={(e) => setFormApt({ ...formApt, payment_method: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                      >
                        {FORMAS_RECEBIMENTO.map((f) => (
                          <option key={f.v} value={f.v}>
                            {f.l}
                          </option>
                        ))}
                      </select>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Data do recebimento</p>
                        <input
                          type="date"
                          value={formApt.paid_at}
                          onChange={(e) => setFormApt({ ...formApt, paid_at: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                          style={{ colorScheme: "dark" }}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase mb-1">Pagar ate (carteira)</p>
                      <input
                        type="date"
                        value={formApt.payment_due_date}
                        onChange={(e) => setFormApt({ ...formApt, payment_due_date: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                  )}
                </div>
              )}
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

      {/* MODAL EQUIPE */}
      {modalEquipe && (
        <div className="fixed inset-0 z-[310] flex items-end sm:items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
              <h3 className="font-black uppercase text-sm flex items-center gap-2">
                <Users size={16} className="text-[#C9A66B]" /> Equipe do salao
              </h3>
              <button type="button" onClick={() => setModalEquipe(false)}>
                <X size={20} className="text-zinc-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Cabeleireiros, manicures, esteticistas, etc. Cada um tem horarios no mesmo calendario; o cliente escolhe
                com quem agendar no link publico. O responsavel (dono) continua nos horarios sem profissional
                associado.
              </p>
              <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-[10px] font-black uppercase text-zinc-500">Novo profissional</p>
                <input
                  placeholder="Nome"
                  value={novoStaff.name}
                  onChange={(e) => setNovoStaff((x) => ({ ...x, name: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  placeholder="Funcao (ex.: Manicure)"
                  value={novoStaff.role_label}
                  onChange={(e) => setNovoStaff((x) => ({ ...x, role_label: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={salvandoStaff}
                  onClick={() => void adicionarStaff()}
                  className="w-full py-2.5 rounded-xl bg-[#C9A66B] text-black font-black text-xs uppercase"
                >
                  {salvandoStaff ? "Salvando..." : "Adicionar"}
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-zinc-500">Cadastrados</p>
                {staffList.length === 0 ? (
                  <p className="text-xs text-zinc-600">Nenhum alem do responsavel.</p>
                ) : (
                  staffList.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{s.name}</p>
                        {s.role_label ? (
                          <p className="text-[10px] text-zinc-500 truncate">{s.role_label}</p>
                        ) : null}
                        {!s.active ? (
                          <p className="text-[9px] font-bold uppercase text-red-400">Inativo</p>
                        ) : null}
                      </div>
                      {s.active ? (
                        <button
                          type="button"
                          onClick={() => void desativarStaffMember(s.id)}
                          className="text-[9px] font-black uppercase text-red-400 shrink-0 px-2 py-1 rounded-lg border border-red-900/50"
                        >
                          Desativar
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CLIENTE */}
      {modalClient && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 shrink-0">
              <h3 className="font-black uppercase text-sm">
                {modalClient === "new" ? "Novo cliente" : formCli.name || "Cliente"}
              </h3>
              <button type="button" onClick={() => setModalClient(null)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            {modalClient !== "new" && (
              <div className="flex gap-1 p-2 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalCliTab("dados")}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase ${
                    modalCliTab === "dados" ? "bg-[#C9A66B] text-black" : "text-zinc-400"
                  }`}
                >
                  Dados
                </button>
                <button
                  type="button"
                  onClick={() => setModalCliTab("historico")}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase ${
                    modalCliTab === "historico" ? "bg-[#C9A66B] text-black" : "text-zinc-400"
                  }`}
                >
                  Historico
                </button>
              </div>
            )}

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {(modalClient === "new" || modalCliTab === "dados") && (
                <>
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
                      className="w-full py-2 text-red-400 text-xs font-bold"
                    >
                      Excluir cliente
                    </button>
                  )}
                </>
              )}

              {modalClient !== "new" && modalCliTab === "historico" && (
                <div className="space-y-2">
                  {loadHist ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-[#C9A66B]" />
                    </div>
                  ) : historicoCliente.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center py-6">Nenhum atendimento vinculado a este cadastro.</p>
                  ) : (
                    <div className="rounded-xl border border-zinc-800 overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-1 text-[9px] font-black uppercase text-zinc-500 p-2 bg-zinc-900 border-b border-zinc-800">
                        <span>Data / servico</span>
                        <span className="text-right">Valor</span>
                        <span className="text-right">Status</span>
                      </div>
                      <ul className="max-h-[50vh] overflow-y-auto divide-y divide-zinc-800/80">
                        {historicoCliente.map((h) => (
                          <li key={h.id} className="grid grid-cols-[1fr_auto_auto] gap-1 p-2 text-xs items-start">
                            <div className="min-w-0">
                              <p className="text-white font-bold">
                                {fmtDataBr(h.appointment_date)} {String(h.appointment_time || "").slice(0, 5)}
                              </p>
                              <p className="text-[10px] text-zinc-500 truncate">{h.service || "—"}</p>
                              {h.paid ? (
                                <p className="text-[9px] text-emerald-500/90">
                                  Pago · {labelFormaPagamento(String(h.payment_method || "nao_info"))}
                                </p>
                              ) : (
                                <p className="text-[9px] text-amber-500/80">Nao pago / pendente</p>
                              )}
                            </div>
                            <span className="text-[#C9A66B] font-black whitespace-nowrap">
                              {h.price != null ? fmtMoney(Number(h.price)) : "—"}
                            </span>
                            <span className="text-[10px] text-zinc-400 text-right whitespace-nowrap">
                              {labelStatusAgenda(h.status)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESTOQUE */}
      {modalInv && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-black uppercase text-sm">Item de estoque</h3>
              <button type="button" onClick={() => setModalInv(null)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <input
              placeholder="Nome (ex.: Shampoo neutro 1L)"
              value={formInv.name}
              onChange={(e) => setFormInv({ ...formInv, name: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Categoria</p>
              <select
                value={formInv.category}
                onChange={(e) => setFormInv({ ...formInv, category: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              >
                {INV_CATS.map((c) => (
                  <option key={c.v} value={c.v}>
                    {c.l}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Quantidade"
                type="number"
                value={formInv.quantity}
                onChange={(e) => setFormInv({ ...formInv, quantity: e.target.value })}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              />
              <input
                placeholder="Unidade (un, cx, L...)"
                value={formInv.unit}
                onChange={(e) => setFormInv({ ...formInv, unit: e.target.value })}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <input
              placeholder="Quantidade minima (alerta de reposicao — opcional)"
              type="number"
              value={formInv.min_quantity}
              onChange={(e) => setFormInv({ ...formInv, min_quantity: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Observacoes (opcional)"
              value={formInv.notes}
              onChange={(e) => setFormInv({ ...formInv, notes: e.target.value })}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm resize-none"
            />
            <button
              type="button"
              onClick={() => void salvarItemEstoque()}
              disabled={saving || !formInv.name.trim()}
              className="w-full py-3 bg-[#C9A66B] text-black font-black text-xs uppercase rounded-xl disabled:opacity-50"
            >
              Salvar
            </button>
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
