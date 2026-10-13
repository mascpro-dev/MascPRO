export const LIMITE_LISTA_LEADS = 500;

export type LeadLista = {
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  empresa: string | null;
  instagram: string | null;
  notas: string | null;
  linha: number;
};

export type LinhaIgnorada = { linha: number; motivo: string };

type Campo =
  | "nome"
  | "telefone"
  | "telefone_1"
  | "telefone_2"
  | "email"
  | "cidade"
  | "estado"
  | "empresa"
  | "instagram"
  | "notas"
  | "tipo"
  | "endereco"
  | "numero"
  | "complemento"
  | "bairro"
  | "cep";

const ALIAS: Record<string, Campo> = {
  nome: "nome",
  name: "nome",
  cliente: "nome",
  telefone: "telefone",
  whatsapp: "telefone",
  celular: "telefone",
  fone: "telefone",
  phone: "telefone",
  "telefone 1": "telefone_1",
  telefone1: "telefone_1",
  "fone 1": "telefone_1",
  "celular 1": "telefone_1",
  "telefone 2": "telefone_2",
  telefone2: "telefone_2",
  "fone 2": "telefone_2",
  "celular 2": "telefone_2",
  email: "email",
  "e-mail": "email",
  cidade: "cidade",
  city: "cidade",
  estado: "estado",
  uf: "estado",
  empresa: "empresa",
  salao: "empresa",
  instagram: "instagram",
  insta: "instagram",
  notas: "notas",
  obs: "notas",
  observacao: "notas",
  tipo: "tipo",
  endereco: "endereco",
  logradouro: "endereco",
  rua: "endereco",
  numero: "numero",
  "nº": "numero",
  "n°": "numero",
  complemento: "complemento",
  bairro: "bairro",
  cep: "cep",
};

function semAcento(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normHeader(v: string): string {
  return semAcento(v.replace(/^\uFEFF/, "").trim().toLowerCase());
}

function limpar(v: string | undefined): string | null {
  const t = String(v || "").trim();
  return t ? t : null;
}

function separarLinha(linha: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        aspas = !aspas;
      }
      continue;
    }
    if (c === sep && !aspas) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function separador(linha: string): string {
  const tabs = (linha.match(/\t/g) || []).length;
  const semis = (linha.match(/;/g) || []).length;
  const commas = (linha.match(/,/g) || []).length;
  if (tabs > 0 && tabs >= semis && tabs >= commas) return "\t";
  if (semis > 0 && semis >= commas) return ";";
  return ",";
}

export function parseListaLeads(texto: string): {
  leads: LeadLista[];
  ignoradas: LinhaIgnorada[];
  erro: string | null;
} {
  const bruto = texto.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const linhas = bruto
    .split("\n")
    .map((l, i) => ({ n: i + 1, raw: l }))
    .filter((l) => l.raw.trim());

  if (linhas.length === 0) {
    return { leads: [], ignoradas: [], erro: "A lista está vazia." };
  }

  const sep = separador(linhas[0].raw);
  const primeira = separarLinha(linhas[0].raw, sep).map(normHeader);
  const temCabecalho = primeira.some((h) => ALIAS[h]);
  const ordem: Campo[] = ["nome", "telefone", "email", "cidade", "estado"];

  if (temCabecalho && !primeira.some((h) => ALIAS[h] === "nome")) {
    return {
      leads: [],
      ignoradas: [],
      erro: "A primeira linha precisa ter a coluna nome.",
    };
  }

  const dados = temCabecalho ? linhas.slice(1) : linhas;
  const leads: LeadLista[] = [];
  const ignoradas: LinhaIgnorada[] = [];
  const vistos = new Set<string>();

  for (const item of dados) {
    const cols = separarLinha(item.raw, sep);
    const rec: Record<Campo, string | null> = {
      nome: null,
      telefone: null,
      telefone_1: null,
      telefone_2: null,
      email: null,
      cidade: null,
      estado: null,
      empresa: null,
      instagram: null,
      notas: null,
      tipo: null,
      endereco: null,
      numero: null,
      complemento: null,
      bairro: null,
      cep: null,
    };
    if (temCabecalho) {
      primeira.forEach((h, idx) => {
        const campo = ALIAS[h];
        if (!campo || rec[campo]) return;
        rec[campo] = limpar(cols[idx]);
      });
    } else {
      ordem.forEach((campo, idx) => {
        rec[campo] = limpar(cols[idx]);
      });
    }

    const nome = rec.nome?.replace(/\s+/g, " ").trim() || "";
    if (!nome) {
      ignoradas.push({ linha: item.n, motivo: "sem nome" });
      continue;
    }

    const fones = [rec.telefone, rec.telefone_1, rec.telefone_2].filter((t): t is string => Boolean(t));
    const telefone = fones[0] || null;
    const tel = telefone?.replace(/[^\d+]/g, "") || "";
    const chave = `${semAcento(nome.toLowerCase())}|${tel}`;
    if (vistos.has(chave)) {
      ignoradas.push({ linha: item.n, motivo: "repetido na lista" });
      continue;
    }
    vistos.add(chave);

    const uf = rec.estado ? rec.estado.trim() : null;
    const extras = fones.slice(1).filter((t) => t.replace(/\D/g, "") !== tel);
    const endereco = [
      rec.endereco,
      rec.numero ? `nº ${rec.numero}` : null,
      rec.complemento,
      rec.bairro,
    ]
      .filter(Boolean)
      .join(", ");
    const notas = [
      rec.tipo ? `Tipo: ${rec.tipo}` : null,
      endereco ? `Endereço: ${endereco}` : null,
      rec.cep ? `CEP: ${rec.cep}` : null,
      extras.length ? `Outros telefones: ${extras.join(" · ")}` : null,
      rec.notas,
    ]
      .filter(Boolean)
      .join("\n");

    leads.push({
      nome: nome.slice(0, 180),
      telefone,
      email: rec.email ? rec.email.toLowerCase() : null,
      cidade: rec.cidade,
      estado: uf && uf.length === 2 ? uf.toUpperCase() : uf,
      empresa: rec.empresa,
      instagram: rec.instagram,
      notas: notas || null,
      linha: item.n,
    });
  }

  if (leads.length > LIMITE_LISTA_LEADS) {
    return {
      leads: [],
      ignoradas,
      erro: `A lista passa de ${LIMITE_LISTA_LEADS} contatos. Divida o arquivo.`,
    };
  }

  if (leads.length === 0) {
    return { leads, ignoradas, erro: "Nenhum contato com nome para subir." };
  }

  return { leads, ignoradas, erro: null };
}
