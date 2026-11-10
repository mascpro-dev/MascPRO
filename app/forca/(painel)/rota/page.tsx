"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { enderecoDaParada, urlRotaMaps } from "@/lib/forcaRota";

type Lead = {
  id: string;
  nome?: string | null;
  empresa?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cep?: string | null;
};

type Parada = { id: string; crm_lead_id: string; ordem: number; lead: Lead | null };

export default function RotaPage() {
  const [cidades, setCidades] = useState<{ cidade: string; uf: string | null }[]>([]);
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [paradas, setParadas] = useState<Lead[]>([]);
  const [disponiveis, setDisponiveis] = useState<Lead[]>([]);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [organizando, setOrganizando] = useState(false);

  useEffect(() => {
    const salva = window.localStorage.getItem("masc_forca_cidade") || "";
    void carregarDia(salva);
  }, []);

  async function carregarDia(preferida: string) {
    const res = await fetch("/api/vendedor/forca/dia", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    const lista = (d?.cidades || []) as { cidade: string; uf: string | null }[];
    setCidades(lista);
    const escolhida = lista.find((c) => c.cidade === preferida)?.cidade || lista[0]?.cidade || "";
    setCidade(escolhida);
    const ufEscolhida = lista.find((c) => c.cidade === escolhida)?.uf || "";
    setUf(ufEscolhida || "");
    if (escolhida) await carregarRota(escolhida);
    else setLoading(false);
  }

  async function carregarRota(nome: string) {
    setLoading(true);
    setErro("");
    const res = await fetch(`/api/vendedor/forca/rota?cidade=${encodeURIComponent(nome)}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir a rota.");
    else {
      const naRota = ((d.paradas || []) as Parada[]).map((p) => p.lead).filter(Boolean) as Lead[];
      setParadas(naRota);
      setDisponiveis(d.disponiveis || []);
      if (d.rota?.uf) setUf(d.rota.uf);
    }
    setLoading(false);
  }

  function escolher(nome: string) {
    setCidade(nome);
    window.localStorage.setItem("masc_forca_cidade", nome);
    const achou = cidades.find((c) => c.cidade === nome);
    setUf(achou?.uf || "");
    void carregarRota(nome);
  }

  async function posicaoAtual() {
    if (!navigator.geolocation) return null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 5000 });
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return null;
    }
  }

  async function organizar(lista: Lead[]) {
    if (lista.length < 2) return lista;
    setOrganizando(true);
    setErro("");
    const origem = await posicaoAtual();
    const res = await fetch("/api/vendedor/forca/rota", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "sequencia",
        origem,
        paradas: lista.map((p) => ({
          crm_lead_id: p.id,
          endereco: p.endereco,
          bairro: p.bairro,
          cidade: p.cidade || cidade,
          estado: p.estado || uf,
          cep: p.cep,
        })),
      }),
    });
    const d = await res.json().catch(() => null);
    setOrganizando(false);
    if (!res.ok || !d?.ok) {
      setErro(d?.error || "Não foi possível ordenar a rota.");
      return lista;
    }
    const porId = new Map(lista.map((lead) => [lead.id, lead]));
    return (d.ids as string[]).map((id) => porId.get(id)).filter(Boolean) as Lead[];
  }

  async function incluir(lead: Lead) {
    const proximas = await organizar([...paradas, lead]);
    setParadas(proximas);
    setDisponiveis((lista) => lista.filter((item) => item.id !== lead.id));
  }

  async function tracarTodos() {
    const todos = [...paradas, ...disponiveis];
    const ordem = await organizar(todos);
    setParadas(ordem);
    setDisponiveis([]);
  }

  function mover(index: number, delta: number) {
    const alvo = index + delta;
    if (alvo < 0 || alvo >= paradas.length) return;
    const copia = [...paradas];
    const [item] = copia.splice(index, 1);
    copia.splice(alvo, 0, item);
    setParadas(copia);
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    setOk("");
    const res = await fetch("/api/vendedor/forca/rota", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cidade,
        uf,
        paradas: paradas.map((p) => ({ crm_lead_id: p.id, planejada: true })),
      }),
    });
    const d = await res.json().catch(() => null);
    setSalvando(false);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível salvar a rota.");
    else setOk("Rota salva.");
  }

  const rotaMaps = urlRotaMaps(paradas.map((lead) => enderecoDaParada(lead)));

  return (
    <div className="space-y-4">
      <select
        value={cidade}
        onChange={(e) => escolher(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
      >
        <option value="">Escolha a cidade</option>
        {cidades.map((c) => (
          <option key={c.cidade} value={c.cidade}>
            {c.cidade}{c.uf ? `/${c.uf}` : ""}
          </option>
        ))}
      </select>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {ok && <p className="text-sm text-emerald-400">{ok}</p>}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-[#C9A66B]" />
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Visitas de hoje · {paradas.length}
              </p>
              {organizando && <span className="text-[10px] font-bold text-[#C9A66B]">Ordenando pelo mais perto...</span>}
            </div>
            {paradas.length === 0 && <p className="text-sm text-zinc-500">Nenhum salão na rota.</p>}
            {paradas.map((lead, index) => (
              <div key={lead.id} className="rounded-xl border border-white/10 px-3 py-3">
                <p className="font-bold">{index + 1}. {lead.empresa || lead.nome}</p>
                <p className="text-xs text-zinc-500">{[lead.endereco, lead.bairro, lead.cidade].filter(Boolean).join(" · ") || "Sem endereço no CRM"}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                  <button type="button" onClick={() => mover(index, -1)} className="text-zinc-400">Subir</button>
                  <button type="button" onClick={() => mover(index, 1)} className="text-zinc-400">Descer</button>
                  <button
                    type="button"
                    onClick={() => {
                      setDisponiveis((lista) => [...lista, lead]);
                      setParadas((lista) => lista.filter((item) => item.id !== lead.id));
                    }}
                    className="text-red-400"
                  >
                    Tirar
                  </button>
                  <Link href={`/forca/visita/${lead.id}`} className="text-[#C9A66B]">Visita</Link>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => void tracarTodos()}
              disabled={!cidade || organizando || paradas.length + disponiveis.length === 0}
              className="w-full rounded-xl border border-[#C9A66B] py-3 text-sm font-black text-[#C9A66B] disabled:opacity-40"
            >
              Traçar melhor rota da cidade
            </button>
            {rotaMaps && (
              <a
                href={rotaMaps}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-black text-white"
              >
                Abrir rota no Maps
              </a>
            )}
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={!cidade || salvando}
              className="w-full rounded-xl bg-[#C9A66B] py-3 text-sm font-black text-black disabled:opacity-40"
            >
              {salvando ? "Salvando..." : "Salvar rota"}
            </button>
          </section>
          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              CRM da cidade · {disponiveis.length}
            </p>
            {disponiveis.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => void incluir(lead)}
                disabled={organizando}
                className="block w-full rounded-xl border border-white/10 px-3 py-3 text-left disabled:opacity-40"
              >
                <p className="font-bold">{lead.empresa || lead.nome}</p>
                <p className="text-xs text-zinc-500">{[lead.endereco, lead.bairro].filter(Boolean).join(" · ")}</p>
                <p className="text-xs text-[#C9A66B]">Incluir na rota</p>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
