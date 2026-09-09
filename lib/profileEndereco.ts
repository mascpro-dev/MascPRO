import { camposLocalizacaoSync } from "@/lib/profileLocalizacao";

/** Colunas de endereço para SELECT (cadastro EN + CRM/NF-e PT). */
export const PROFILE_ENDERECO_SELECT =
  "cep, address, number, complement, neighborhood, city, state, logradouro, numero, complemento, bairro, municipio, uf";

export type EnderecoUnificado = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  /** aliases EN (mesmo valor) */
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ProfileEnderecoLike = {
  cep?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
};

/** Lê endereço unificando colunas do cadastro (EN) e do CRM/NF-e (PT). */
export function lerEnderecoProfile(profile: ProfileEnderecoLike | null | undefined): EnderecoUnificado {
  const p = profile || {};
  const logradouro = String(p.logradouro || p.address || "").trim();
  const numero = String(p.numero || p.number || "").trim();
  const complemento = String(p.complemento || p.complement || "").trim();
  const bairro = String(p.bairro || p.neighborhood || "").trim();
  const municipio = String(p.municipio || p.city || "").trim();
  const uf = String(p.uf || p.state || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  const cep = String(p.cep || "").trim();

  return {
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    municipio,
    uf,
    address: logradouro,
    number: numero,
    complement: complemento,
    neighborhood: bairro,
    city: municipio,
    state: uf,
  };
}

/** Monta texto de entrega a partir do endereço unificado ou body parcial. */
export function montarEnderecoTexto(
  src: Partial<EnderecoUnificado> & ProfileEnderecoLike & Record<string, unknown>
): string {
  const e = lerEnderecoProfile(src as ProfileEnderecoLike);
  const partes = [
    e.logradouro,
    e.numero ? `nº ${e.numero}` : "",
    e.complemento,
    e.bairro,
    e.municipio && e.uf ? `${e.municipio}/${e.uf}` : e.municipio || e.uf,
  ].filter(Boolean);
  return partes.join(", ");
}

type EnderecoInput = {
  cep?: string | null;
  logradouro?: string | null;
  address?: string | null;
  numero?: string | null;
  number?: string | null;
  complemento?: string | null;
  complement?: string | null;
  bairro?: string | null;
  neighborhood?: string | null;
  municipio?: string | null;
  city?: string | null;
  uf?: string | null;
  state?: string | null;
};

/**
 * Grava endereço nas duas convenções (EN + PT) para não “sumir” entre
 * cadastro, admin, pedidos e NF-e.
 */
export function camposEnderecoCompletoSync(input: EnderecoInput): Record<string, string | null> {
  const out: Record<string, string | null> = {};

  const pick = (...vals: (string | null | undefined)[]) => {
    for (const v of vals) {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    return null;
  };

  if (
    input.cep !== undefined ||
    input.logradouro !== undefined ||
    input.address !== undefined ||
    input.numero !== undefined ||
    input.number !== undefined ||
    input.complemento !== undefined ||
    input.complement !== undefined ||
    input.bairro !== undefined ||
    input.neighborhood !== undefined ||
    input.municipio !== undefined ||
    input.city !== undefined ||
    input.uf !== undefined ||
    input.state !== undefined
  ) {
    if (input.cep !== undefined) out.cep = pick(input.cep);

    const rua = pick(input.logradouro, input.address);
    if (input.logradouro !== undefined || input.address !== undefined) {
      out.logradouro = rua;
      out.address = rua;
    }

    const num = pick(input.numero, input.number);
    if (input.numero !== undefined || input.number !== undefined) {
      out.numero = num;
      out.number = num;
    }

    const comp = pick(input.complemento, input.complement);
    if (input.complemento !== undefined || input.complement !== undefined) {
      out.complemento = comp;
      out.complement = comp;
    }

    const bai = pick(input.bairro, input.neighborhood);
    if (input.bairro !== undefined || input.neighborhood !== undefined) {
      out.bairro = bai;
      out.neighborhood = bai;
    }

    const cidade = pick(input.municipio, input.city);
    const uf = pick(input.uf, input.state);
    if (
      input.municipio !== undefined ||
      input.city !== undefined ||
      input.uf !== undefined ||
      input.state !== undefined
    ) {
      Object.assign(out, camposLocalizacaoSync(cidade ?? "", uf ?? ""));
    }
  }

  return out;
}

/** Normaliza row do banco para resposta de API com campos PT preenchidos. */
export function enriquecerPerfilComEndereco<T extends Record<string, unknown>>(row: T) {
  const e = lerEnderecoProfile(row as ProfileEnderecoLike);
  return {
    ...row,
    ...e,
  };
}
