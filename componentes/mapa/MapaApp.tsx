"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Instagram,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
  Share2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import MapaHeader from "@/componentes/mapa/MapaHeader";
import LogoMasc from "@/componentes/mapa/LogoMasc";
import MapaLeaflet from "@/componentes/mapa/MapaLeaflet";
import {
  PIN_META,
  distanciaKm,
  espalharPins,
  formatarDistancia,
  linkInstagram,
  linkWhatsapp,
  type PinTipo,
  type SalaoPublico,
} from "@/lib/mapaSaloes";

type Centro = { lat: number; lng: number; rotulo: string };
type ComDistancia = SalaoPublico & { km: number | null };

const RAIOS = [5, 15, 30, 50];

export default function MapaApp() {
  const params = useSearchParams();
  const [saloes, setSaloes] = useState<SalaoPublico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modo, setModo] = useState<"inicio" | "busca">("inicio");
  const [texto, setTexto] = useState("");
  const [centro, setCentro] = useState<Centro | null>(null);
  const [raio, setRaio] = useState(15);
  const [tipo, setTipo] = useState<"todos" | "saloes" | "profissionais">("todos");
  const [filtros, setFiltros] = useState({
    aberto: false,
    agenda: false,
    embaixador: false,
    educador: false,
  });
  const [painelFiltro, setPainelFiltro] = useState(false);
  const [servico, setServico] = useState<string | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [focoKey, setFocoKey] = useState("inicio");
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch("/api/mapa");
        const data = await res.json();
        if (!vivo) return;
        if (data.ok === false) {
          setAviso("Não foi possível carregar os salões agora.");
          return;
        }
        const lista: SalaoPublico[] = data.saloes || [];
        setSaloes(lista);
        if (data.precisaSql) {
          setAviso("O mapa está no ar. Para os salões aparecerem, rode supabase/mapa_saloes.sql no SQL Editor do Supabase.");
        }
        const q = params.get("q") || "";
        const ver = params.get("ver");
        const salao = params.get("salao");
        if (q) {
          setTexto(q);
          await aplicarBusca(q, false);
        } else if (ver === "mapa") {
          setModo("busca");
          setRaio(400);
          setFocoKey("todos");
        }
        if (salao) setSelecionadoId(salao);
      } catch {
        if (vivo) setAviso("Não foi possível carregar os salões.");
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
    // A busca inicial lê a URL uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buscaUrl = params.toString();
  useEffect(() => {
    const q = new URLSearchParams(buscaUrl);
    if (q.get("ver") === "mapa" || q.get("q")) return;
    setModo("inicio");
    setSelecionadoId(null);
  }, [buscaUrl]);

  async function aplicarBusca(q: string, mostrarAviso = true) {
    const consulta = q.trim();
    if (!consulta) {
      if (mostrarAviso) setAviso("Digite uma cidade ou um bairro.");
      return;
    }
    setBuscando(true);
    setAviso(null);
    setSelecionadoId(null);
    try {
      const res = await fetch(`/api/mapa?q=${encodeURIComponent(consulta)}`);
      const data = await res.json();
      if (data.saloes) setSaloes(data.saloes);
      if (!data.centro) {
        setAviso("Não encontrei essa região. Tente o nome da cidade.");
        setModo("busca");
        return;
      }
      setCentro(data.centro);
      setRaio(15);
      setModo("busca");
      setFocoKey(`${consulta}-${Date.now()}`);
    } catch {
      setAviso("Falha ao buscar. Tente de novo.");
    } finally {
      setBuscando(false);
    }
  }

  function usarLocalizacao() {
    setAviso(null);
    if (!navigator.geolocation) {
      setAviso("Este navegador não entrega a localização. Busque pela cidade.");
      return;
    }
    setBuscando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCentro({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          rotulo: "Perto de você",
        });
        setTexto("");
        setRaio(15);
        setModo("busca");
        setSelecionadoId(null);
        setFocoKey(`geo-${Date.now()}`);
        setBuscando(false);
      },
      () => {
        setBuscando(false);
        setAviso("Não consegui usar sua localização. Libere o acesso ou busque pela cidade.");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    aplicarBusca(texto);
  }

  const lista = useMemo(() => {
    const base: ComDistancia[] = saloes.map((s) => ({
      ...s,
      km: centro ? distanciaKm(centro, s) : null,
    }));
    let items = base;
    if (modo === "busca" && centro && raio < 400) {
      const alvo = normalizar(texto);
      items = items.filter((s) => {
        if ((s.km ?? 9999) <= raio) return true;
        if (!alvo) return false;
        return normalizar(`${s.cidade} ${s.uf} ${s.endereco} ${s.salao}`).includes(alvo);
      });
    }
    if (tipo === "saloes") items = items.filter((s) => s.workType === "Salão Próprio");
    if (tipo === "profissionais") {
      items = items.filter((s) => s.workType === "Alugo Cadeira" || s.workType === "Comissionado");
    }
    if (filtros.aberto) items = items.filter((s) => s.aberto);
    if (filtros.agenda) items = items.filter((s) => Boolean(s.agenda));
    if (filtros.embaixador) items = items.filter((s) => s.pin === "embaixador");
    if (filtros.educador) items = items.filter((s) => s.pin === "educador");
    if (servico) {
      const alvo = normalizar(servico);
      items = items.filter((s) => s.servicos.some((n) => normalizar(n) === alvo));
    }
    items.sort((a, b) => (a.km ?? 9999) - (b.km ?? 9999) || a.salao.localeCompare(b.salao, "pt-BR"));
    return items;
  }, [saloes, centro, modo, raio, texto, tipo, filtros, servico]);

  const pins = useMemo(() => espalharPins(modo === "busca" ? lista : saloes), [modo, lista, saloes]);
  const selecionado = saloes.find((s) => s.id === selecionadoId) || null;
  const servicosHome = useMemo(() => {
    const nomes = new Map<string, string>();
    for (const s of saloes) {
      for (const n of s.servicos) {
        const k = normalizar(n);
        if (!nomes.has(k)) nomes.set(k, n);
      }
    }
    return [...nomes.values()].slice(0, 8);
  }, [saloes]);

  async function compartilhar(salao: SalaoPublico) {
    const url = `${window.location.origin}/mapa?salao=${salao.id}`;
    const titulo = salao.salao;
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
        return;
      } catch {
        /* usuário cancelou ou o navegador recusou */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (modo === "busca") {
    return (
      <div className="flex h-[100dvh] flex-col bg-[#FFFBF8] text-[#1A1A1A]">
        <MapaHeader />
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="order-2 flex min-h-0 w-full flex-1 flex-col border-black/5 bg-white md:order-1 md:w-[420px] md:flex-none md:border-r">
            {selecionado ? (
              <Ficha
                salao={selecionado}
                km={centro ? distanciaKm(centro, selecionado) : null}
                onVoltar={() => setSelecionadoId(null)}
                onCompartilhar={() => compartilhar(selecionado)}
                copiado={copiado}
              />
            ) : (
              <Lista
                texto={texto}
                setTexto={setTexto}
                onSubmit={onSubmit}
                buscando={buscando}
                onGeo={usarLocalizacao}
                tipo={tipo}
                setTipo={setTipo}
                painelFiltro={painelFiltro}
                setPainelFiltro={setPainelFiltro}
                filtros={filtros}
                setFiltros={setFiltros}
                lista={lista}
                raio={raio}
                onRaio={(n) => {
                  setRaio(n);
                  setFocoKey(`raio-${n}-${Date.now()}`);
                }}
                aviso={aviso}
                onSelect={setSelecionadoId}
                carregando={carregando}
                centro={centro}
              />
            )}
          </aside>
          <div className="relative order-1 h-[42vh] min-h-[240px] md:order-2 md:h-auto md:min-h-0 md:flex-1">
            <MapaLeaflet
              saloes={pins}
              centro={centro}
              selecionadoId={selecionadoId}
              onSelect={(id) => setSelecionadoId(id)}
              focoKey={focoKey}
            />
            <Legenda />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF8] text-[#1A1A1A]">
      <MapaHeader />
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,#fde8e6,transparent_42%),linear-gradient(#fffdfb,#f7f1ea)]" />
        <div className="relative mx-auto max-w-3xl px-4 pb-10 pt-14 text-center md:pt-20">
          <LogoMasc className="mx-auto mb-5 h-16 w-auto" />
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E23B4A]">Mapa de salões</p>
          <h1 className="mx-auto mt-4 max-w-xl text-4xl font-semibold leading-[1.05] text-[#1A1A1A] [font-family:var(--font-mapa),Georgia,serif] md:text-6xl">
            O salão certo,
            <span className="text-[#E23B4A]"> perto de você.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-zinc-600">
            Busque pela cidade ou use sua localização. O pin abre WhatsApp, Instagram e a agenda de quem já está no app.
          </p>
          <BuscaBarra
            texto={texto}
            setTexto={setTexto}
            onSubmit={onSubmit}
            buscando={buscando}
            onGeo={usarLocalizacao}
            className="mx-auto mt-8 max-w-2xl text-left"
          />
          {aviso && <p className="mt-3 text-sm text-[#E23B4A]">{aviso}</p>}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">No mapa</p>
            <h2 className="text-2xl font-semibold [font-family:var(--font-mapa),Georgia,serif]">Salões perto de você</h2>
            <p className="text-sm text-zinc-500">
              {carregando
                ? "Carregando salões..."
                : saloes.length
                  ? `${saloes.length} ${saloes.length === 1 ? "salão publicado" : "salões publicados"}. Ative a localização para ver os mais perto.`
                  : "Ainda não há salão publicado. Quem completa o perfil no app aparece aqui."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setModo("busca");
              setRaio(400);
              setFocoKey(`todos-${Date.now()}`);
            }}
            className="hidden shrink-0 rounded-full bg-[#E23B4A] px-4 py-2.5 text-sm font-semibold text-white sm:inline-flex"
          >
            Ver todos no mapa
          </button>
        </div>
        <div className="relative h-[420px] overflow-hidden rounded-3xl border border-black/5 shadow-sm">
          <MapaLeaflet
            saloes={espalharPins(saloes)}
            centro={null}
            selecionadoId={null}
            onSelect={(id) => {
              setSelecionadoId(id);
              setModo("busca");
              setRaio(400);
              setFocoKey(`pin-${id}`);
            }}
            focoKey={saloes.map((s) => s.id).join(",")}
          />
          <button
            type="button"
            onClick={() => {
              setModo("busca");
              setRaio(400);
              setFocoKey(`todos-${Date.now()}`);
            }}
            className="absolute bottom-4 left-4 z-[1000] rounded-full bg-[#E23B4A] px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            Ver todos os salões no mapa
          </button>
        </div>

        {servicosHome.length > 0 && (
          <div className="mt-12">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Serviços</p>
                <h2 className="text-2xl font-semibold [font-family:var(--font-mapa),Georgia,serif]">
                  O que os salões oferecem
                </h2>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {servicosHome.map((nome) => (
                <button
                  key={nome}
                  type="button"
                  onClick={() => {
                    setServico(nome);
                    setModo("busca");
                    setRaio(400);
                    setFocoKey(`srv-${nome}`);
                  }}
                  className="shrink-0 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm font-medium shadow-sm hover:border-[#E23B4A]/40"
                >
                  {nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 overflow-hidden rounded-[28px] bg-[#6d2430] text-white">
          <div className="grid items-center gap-6 px-6 py-10 md:grid-cols-[1.3fr_0.7fr] md:px-10">
            <div>
              <LogoMasc branca className="mb-4 h-12 w-auto" />
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Para salões e profissionais</p>
              <h2 className="mt-2 max-w-lg text-3xl font-semibold leading-tight [font-family:var(--font-mapa),Georgia,serif] md:text-4xl">
                Coloque seu salão no mapa
              </h2>
              <p className="mt-3 max-w-md text-sm text-white/80">
                Preencha seus dados. A ficha chega no WhatsApp e você recebe o link do app para aparecer na busca.
              </p>
              <Link
                href="/mapa/inscrever"
                className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#6d2430]"
              >
                Inscrever meu salão
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BuscaBarra({
  texto,
  setTexto,
  onSubmit,
  buscando,
  onGeo,
  className,
  compacto = false,
}: {
  texto: string;
  setTexto: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  buscando: boolean;
  onGeo: () => void;
  className?: string;
  compacto?: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={
        compacto
          ? `flex flex-col gap-2 ${className || ""}`
          : `flex flex-col gap-2 rounded-[28px] border border-black/10 bg-white p-2 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center ${className || ""}`
      }
    >
      <label className={`flex min-w-0 flex-1 items-center gap-2 px-3 ${compacto ? "rounded-xl border border-black/10 bg-zinc-50" : ""}`}>
        <Search size={18} className="shrink-0 text-zinc-400" />
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Busque por cidade ou bairro"
          className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-zinc-400"
        />
      </label>
      <button
        type="button"
        onClick={onGeo}
        className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
      >
        <Navigation size={15} />
        Usar minha localização
      </button>
      <button
        type="submit"
        disabled={buscando}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E23B4A] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {buscando ? <Loader2 size={16} className="animate-spin" /> : null}
        Buscar
      </button>
    </form>
  );
}

function Lista({
  texto,
  setTexto,
  onSubmit,
  buscando,
  onGeo,
  tipo,
  setTipo,
  painelFiltro,
  setPainelFiltro,
  filtros,
  setFiltros,
  lista,
  raio,
  onRaio,
  aviso,
  onSelect,
  carregando,
  centro,
}: {
  texto: string;
  setTexto: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  buscando: boolean;
  onGeo: () => void;
  tipo: "todos" | "saloes" | "profissionais";
  setTipo: (v: "todos" | "saloes" | "profissionais") => void;
  painelFiltro: boolean;
  setPainelFiltro: (v: boolean) => void;
  filtros: { aberto: boolean; agenda: boolean; embaixador: boolean; educador: boolean };
  setFiltros: (v: { aberto: boolean; agenda: boolean; embaixador: boolean; educador: boolean }) => void;
  lista: ComDistancia[];
  raio: number;
  onRaio: (n: number) => void;
  aviso: string | null;
  onSelect: (id: string) => void;
  carregando: boolean;
  centro: Centro | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-black/5 px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#E23B4A]">Sua busca</p>
        <h2 className="text-2xl font-semibold [font-family:var(--font-mapa),Georgia,serif]">Encontre o salão ideal</h2>
        <p className="text-sm text-zinc-500">
          {centro ? `Resultados perto de ${centro.rotulo}.` : "Resultados da sua busca."}
        </p>
        <div className="mt-3">
          <BuscaBarra compacto texto={texto} setTexto={setTexto} onSubmit={onSubmit} buscando={buscando} onGeo={onGeo} />
        </div>
        {aviso && <p className="mt-2 text-sm text-[#E23B4A]">{aviso}</p>}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-1 rounded-full bg-zinc-100 p-1">
            {(
              [
                ["todos", "Todos"],
                ["saloes", "Salões"],
                ["profissionais", "Profissionais"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTipo(id)}
                className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold ${
                  tipo === id ? "bg-[#E23B4A] text-white" : "text-zinc-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPainelFiltro(!painelFiltro)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/10"
            aria-label="Filtros"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
        {painelFiltro && (
          <div className="mt-3 rounded-2xl border border-black/10 bg-white p-4 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Filtros</p>
              <button type="button" onClick={() => setPainelFiltro(false)} aria-label="Fechar filtros">
                <X size={16} />
              </button>
            </div>
            <FiltroLinha label="Aberto agora" on={filtros.aberto} toggle={() => setFiltros({ ...filtros, aberto: !filtros.aberto })} />
            <FiltroLinha label="Com agendamento" on={filtros.agenda} toggle={() => setFiltros({ ...filtros, agenda: !filtros.agenda })} />
            <FiltroLinha label="Embaixador" on={filtros.embaixador} toggle={() => setFiltros({ ...filtros, embaixador: !filtros.embaixador })} />
            <FiltroLinha label="Educador" on={filtros.educador} toggle={() => setFiltros({ ...filtros, educador: !filtros.educador })} />
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {carregando && (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 size={16} className="animate-spin" /> Buscando salões...
          </p>
        )}
        {!carregando && lista.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/10 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
            <LogoMasc className="mb-3 h-10 w-auto" />
            <p>Nenhum salão neste recorte{raio < 400 ? ` de ${raio} km` : ""}.</p>
            {raio < 50 && (
              <button
                type="button"
                onClick={() => onRaio(raio === 5 ? 15 : raio === 15 ? 30 : 50)}
                className="mt-3 font-semibold text-[#E23B4A]"
              >
                Ampliar a busca
              </button>
            )}
          </div>
        )}
        {lista.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-[#f3d7d9] bg-white px-3 py-3 text-left shadow-sm hover:border-[#E23B4A]/50"
          >
            <Avatar nome={s.salao} url={s.avatar} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                {s.pin === "destaque" && <span className="text-[#C9A66B]">★</span>}
                <span className="truncate font-semibold">{s.salao}</span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-zinc-500">
                {[s.cidade, s.uf].filter(Boolean).join(" · ")}
                {s.km != null ? ` · ${formatarDistancia(s.km)}` : ""}
              </span>
              <span className="mt-1 flex flex-wrap gap-1.5">
                {s.aberto && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Aberto agora
                  </span>
                )}
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${PIN_META[s.pin].cor}18`, color: PIN_META[s.pin].cor }}>
                  {PIN_META[s.pin].label}
                </span>
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-zinc-300" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Ficha({
  salao,
  km,
  onVoltar,
  onCompartilhar,
  copiado,
}: {
  salao: SalaoPublico;
  km: number | null;
  onVoltar: () => void;
  onCompartilhar: () => void;
  copiado: boolean;
}) {
  const ig = linkInstagram(salao.instagram);
  const wa = linkWhatsapp(
    salao.whatsapp,
    `Olá! Vi ${salao.salao} no Mapa de Salões e quero saber mais.`
  );
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${salao.lat},${salao.lng}`;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <button type="button" onClick={onVoltar} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500">
        <ArrowLeft size={16} /> Voltar
      </button>
      <div className="flex items-start gap-3">
        <Avatar nome={salao.salao} url={salao.avatar} />
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold leading-tight [font-family:var(--font-mapa),Georgia,serif]">{salao.salao}</h2>
          {salao.nome !== salao.salao && <p className="text-sm text-zinc-500">{salao.nome}</p>}
          <p className="mt-1 text-xs font-semibold" style={{ color: PIN_META[salao.pin].cor }}>
            {PIN_META[salao.pin as PinTipo].label}
          </p>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 text-sm text-zinc-600">
        <MapPin size={16} className="mt-0.5 shrink-0 text-[#E23B4A]" />
        <span>
          {salao.endereco || "Endereço não informado"}
          {km != null ? ` · ${formatarDistancia(km)}` : ""}
        </span>
      </p>

      {salao.aberto && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Aberto agora
        </p>
      )}

      {salao.bio && <p className="mt-4 text-sm leading-relaxed text-zinc-600">{salao.bio}</p>}

      {salao.servicos.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Serviços</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {salao.servicos.map((n) => (
              <span key={n} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {salao.agenda && (
          <Link
            href={salao.agenda}
            className="flex items-center justify-center gap-2 rounded-full bg-[#1FA971] py-3 text-sm font-semibold text-white"
          >
            <Calendar size={16} /> Agende agora
          </Link>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-full border border-[#1FA971] py-3 text-sm font-semibold text-[#128C7E]"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-zinc-500">
        <a href={maps} target="_blank" rel="noreferrer" className="rounded-2xl bg-rose-50 px-2 py-3 font-medium text-[#E23B4A]">
          <Navigation size={16} className="mx-auto mb-1" />
          Como chegar
        </a>
        {ig ? (
          <a href={ig.href} target="_blank" rel="noreferrer" className="rounded-2xl bg-rose-50 px-2 py-3 font-medium text-[#E23B4A]">
            <Instagram size={16} className="mx-auto mb-1" />
            {ig.handle}
          </a>
        ) : (
          <span className="rounded-2xl bg-zinc-50 px-2 py-3 text-zinc-400">
            <Instagram size={16} className="mx-auto mb-1" />
            Instagram
          </span>
        )}
        <button type="button" onClick={onCompartilhar} className="rounded-2xl bg-rose-50 px-2 py-3 font-medium text-[#E23B4A]">
          <Share2 size={16} className="mx-auto mb-1" />
          {copiado ? "Copiado" : "Compartilhar"}
        </button>
      </div>
    </div>
  );
}

function FiltroLinha({ label, on, toggle }: { label: string; on: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} className="flex w-full items-center justify-between py-2 text-sm">
      <span>{label}</span>
      <span className={`h-6 w-10 rounded-full p-0.5 transition-colors ${on ? "bg-[#E23B4A]" : "bg-zinc-200"}`}>
        <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

function Avatar({ nome, url }: { nome: string; url: string | null }) {
  if (url) {
    return <img src={url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />;
  }
  const letra = (nome || "?").trim().charAt(0).toUpperCase();
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#fde8e6] text-lg font-semibold text-[#E23B4A]">
      {letra}
    </span>
  );
}

function Legenda() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] hidden max-w-[200px] rounded-2xl bg-white/95 p-3 text-[11px] shadow-lg md:block">
      <p className="mb-1 font-bold uppercase tracking-widest text-zinc-400">Cores dos pins</p>
      {(Object.keys(PIN_META) as PinTipo[]).map((k) => (
        <p key={k} className="flex items-center gap-2 py-0.5 text-zinc-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIN_META[k].cor }} />
          {PIN_META[k].label}
        </p>
      ))}
    </div>
  );
}

function normalizar(v: string) {
  return String(v || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}
