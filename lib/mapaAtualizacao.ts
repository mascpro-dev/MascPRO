import { readFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { MAPA_TILE_URL } from "@/lib/mapaSaloes";

export const MAPA_DIAS_ATUALIZACAO = 15;
const CHAVE = "mapa_plugin_checagem";
const INTERVALO_MS = MAPA_DIAS_ATUALIZACAO * 24 * 60 * 60 * 1000;

export type ResultadoMapaAtualizacao = {
  ok: boolean;
  consultado: boolean;
  instalada: string;
  estavel: string | null;
  atrasado: boolean;
  tilesOk: boolean;
  em: string | null;
  proxima: string | null;
};

type Gravado = {
  em: string;
  instalada: string;
  estavel: string | null;
  atrasado: boolean;
  tilesOk: boolean;
};

let memoria: Gravado | null = null;

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function versaoInstalada(): string {
  try {
    const raw = readFileSync(path.join(process.cwd(), "node_modules", "leaflet", "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return String(pkg.version || "1.9.4");
  } catch {
    return "1.9.4";
  }
}

function ehEstavel(v: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(v);
}

function versaoMaior(nova: string, atual: string): boolean {
  const a = nova.split(".").map((n) => Number(n) || 0);
  const b = atual.split(".").map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

function dentroDoPrazo(em: string | null | undefined): boolean {
  const t = Date.parse(String(em || ""));
  return Number.isFinite(t) && Date.now() - t < INTERVALO_MS;
}

function montar(g: Gravado, consultado: boolean): ResultadoMapaAtualizacao {
  const t = Date.parse(g.em);
  return {
    ok: true,
    consultado,
    instalada: g.instalada,
    estavel: g.estavel,
    atrasado: g.atrasado,
    tilesOk: g.tilesOk,
    em: g.em,
    proxima: Number.isFinite(t) ? new Date(t + INTERVALO_MS).toISOString() : null,
  };
}

async function lerGravado(): Promise<Gravado | null> {
  if (memoria && dentroDoPrazo(memoria.em)) return memoria;
  const db = sb();
  if (!db) return memoria;
  const { data } = await db.from("system_config").select("valor").eq("chave", CHAVE).maybeSingle();
  if (!data?.valor) return null;
  try {
    const g = JSON.parse(String(data.valor)) as Gravado;
    if (!g?.em) return null;
    memoria = g;
    return g;
  } catch {
    return null;
  }
}

async function gravar(g: Gravado) {
  memoria = g;
  const db = sb();
  if (!db) return;
  await db.from("system_config").upsert(
    {
      chave: CHAVE,
      valor: JSON.stringify(g),
      descricao: "Consulta online do Leaflet e dos tiles do mapa, a cada 15 dias",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "chave" }
  );
}

async function consultarNpm(): Promise<string | null> {
  const res = await fetch("https://registry.npmjs.org/leaflet/latest", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { version?: string };
  const v = String(data.version || "").trim();
  return ehEstavel(v) ? v : null;
}

async function consultarTiles(): Promise<boolean> {
  const url = MAPA_TILE_URL.replace("{z}", "0").replace("{x}", "0").replace("{y}", "0");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MascPRO-Mapa/1.0 (checagem de tiles a cada 15 dias)" },
      cache: "no-store",
      signal: ctrl.signal,
    });
    const tipo = res.headers.get("content-type") || "";
    return res.ok && tipo.includes("image");
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Consulta o npm e um tile do OpenStreetMap. Repete no máximo a cada 15 dias. */
export async function buscarAtualizacaoMapaOnline(): Promise<ResultadoMapaAtualizacao> {
  const instalada = versaoInstalada();
  const guardado = await lerGravado();
  if (guardado && dentroDoPrazo(guardado.em)) return montar(guardado, false);

  let estavel: string | null = null;
  let tilesOk = false;
  try {
    [estavel, tilesOk] = await Promise.all([consultarNpm(), consultarTiles()]);
  } catch {
    estavel = null;
    tilesOk = false;
  }

  const g: Gravado = {
    em: new Date().toISOString(),
    instalada,
    estavel,
    atrasado: Boolean(estavel && versaoMaior(estavel, instalada)),
    tilesOk,
  };
  try {
    await gravar(g);
  } catch {
    memoria = g;
  }
  return montar(g, true);
}
