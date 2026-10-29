import { LIMITE_LISTA_LEADS, parseListaLeads, type LeadLista, type LinhaIgnorada } from "@/lib/crmImportarLista";
import { normalizarTelefoneBr } from "@/lib/crmCarteira";

export const CAMPOS_PLANILHA = [
  { value: "nome", label: "Nome" },
  { value: "empresa", label: "Empresa/salão" },
  { value: "telefone", label: "Telefone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "cidade", label: "Cidade" },
  { value: "estado", label: "Estado" },
  { value: "bairro", label: "Bairro" },
  { value: "endereco", label: "Endereço" },
  { value: "cep", label: "CEP" },
  { value: "categoria", label: "Categoria profissional" },
  { value: "observacoes", label: "Observações" },
  { value: "origem_lista", label: "Origem da lista" },
  { value: "ignorar", label: "Ignorar coluna" },
] as const;

export type CampoPlanilha = (typeof CAMPOS_PLANILHA)[number]["value"];

const ALIAS_MAP: Record<string, CampoPlanilha> = {
  nome: "nome",
  name: "nome",
  cliente: "nome",
  contato: "nome",
  empresa: "empresa",
  salao: "empresa",
  "salão": "empresa",
  telefone: "telefone",
  fone: "telefone",
  celular: "telefone",
  phone: "telefone",
  whatsapp: "whatsapp",
  email: "email",
  "e-mail": "email",
  cidade: "cidade",
  city: "cidade",
  municipio: "cidade",
  estado: "estado",
  uf: "estado",
  bairro: "bairro",
  endereco: "endereco",
  "endereço": "endereco",
  logradouro: "endereco",
  rua: "endereco",
  cep: "cep",
  categoria: "categoria",
  tipo: "categoria",
  perfil: "categoria",
  obs: "observacoes",
  observacao: "observacoes",
  observacoes: "observacoes",
  notas: "observacoes",
  origem: "origem_lista",
  lista: "origem_lista",
};

function semAcento(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function normHeader(v: string) {
  return semAcento(String(v || "").replace(/^\uFEFF/, "").trim().toLowerCase());
}

export type LeadImportacao = LeadLista & {
  bairro: string | null;
  endereco: string | null;
  cep: string | null;
  telefone_normalizado: string | null;
  origem_lista: string | null;
};

export function sugerirMapeamento(cabecalhos: string[]): CampoPlanilha[] {
  return cabecalhos.map((h) => ALIAS_MAP[normHeader(h)] || "ignorar");
}

export function emailValido(v: string | null) {
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function parseMatrizLeads(
  cabecalhos: string[],
  linhas: string[][],
  mapeamento: CampoPlanilha[],
  origemArquivo?: string
): { leads: LeadImportacao[]; ignoradas: LinhaIgnorada[]; erro: string | null } {
  const leads: LeadImportacao[] = [];
  const ignoradas: LinhaIgnorada[] = [];
  const vistos = new Set<string>();

  linhas.forEach((cols, i) => {
    const linha = i + 2;
    const rec: Record<string, string | null> = {};
    mapeamento.forEach((campo, idx) => {
      if (!campo || campo === "ignorar") return;
      const v = String(cols[idx] ?? "").trim();
      if (!v) return;
      if (!rec[campo]) rec[campo] = v;
    });
    const nome = String(rec.nome || "").replace(/\s+/g, " ").trim();
    if (!nome) {
      ignoradas.push({ linha, motivo: "sem nome" });
      return;
    }
    const telRaw = rec.telefone || rec.whatsapp || null;
    const telNorm = normalizarTelefoneBr(telRaw);
    if (telRaw && !telNorm) {
      ignoradas.push({ linha, motivo: "telefone sem DDD ou malformado" });
      return;
    }
    if (rec.email && !emailValido(rec.email.toLowerCase())) {
      ignoradas.push({ linha, motivo: "e-mail inválido" });
      return;
    }
    const chave = `${semAcento(nome.toLowerCase())}|${telNorm || ""}`;
    if (vistos.has(chave)) {
      ignoradas.push({ linha, motivo: "repetido na lista" });
      return;
    }
    vistos.add(chave);
    const uf = rec.estado ? rec.estado.trim() : null;
    const notas = [rec.categoria ? `Categoria: ${rec.categoria}` : null, rec.observacoes].filter(Boolean).join("\n");
    leads.push({
      nome: nome.slice(0, 180),
      telefone: telRaw,
      email: rec.email ? rec.email.toLowerCase() : null,
      cidade: rec.cidade || null,
      estado: uf && uf.length === 2 ? uf.toUpperCase() : uf,
      empresa: rec.empresa || null,
      instagram: null,
      notas: notas || null,
      linha,
      bairro: rec.bairro || null,
      endereco: rec.endereco || null,
      cep: rec.cep || null,
      telefone_normalizado: telNorm,
      origem_lista: rec.origem_lista || origemArquivo || null,
    });
  });

  if (leads.length > LIMITE_LISTA_LEADS) {
    return { leads: [], ignoradas, erro: `A lista passa de ${LIMITE_LISTA_LEADS} contatos. Divida o arquivo.` };
  }
  if (!leads.length) return { leads, ignoradas, erro: "Nenhum contato com nome para subir." };
  return { leads, ignoradas, erro: null };
}

export function textoParaMatriz(texto: string): { cabecalhos: string[]; linhas: string[][] } {
  const parsed = parseListaLeads(texto);
  if (parsed.erro && !parsed.leads.length) {
    return { cabecalhos: [], linhas: [] };
  }
  const cabecalhos = ["Nome", "Empresa", "Telefone", "E-mail", "Cidade", "UF", "Observações"];
  const linhas = parsed.leads.map((l) => [
    l.nome,
    l.empresa || "",
    l.telefone || "",
    l.email || "",
    l.cidade || "",
    l.estado || "",
    l.notas || "",
  ]);
  return { cabecalhos, linhas };
}
