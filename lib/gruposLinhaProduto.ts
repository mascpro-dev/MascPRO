import { LINHAS_PRODUTO } from "@/lib/comercialClassificacao";

export const SEM_LINHA = "sem_linha";

/** Cor da faixa impressa na embalagem de cada linha. */
export const FAIXA_LINHA: Record<string, { bg: string; fg: string }> = {
  daily: { bg: "#D4CBB8", fg: "#2C261C" },
  nutri: { bg: "#E0C07A", fg: "#2A2110" },
  repair: { bg: "#8B3A4F", fg: "#FFFFFF" },
  scalp: { bg: "#9EB62E", fg: "#1A2208" },
  curls: { bg: "#7A9CC6", fg: "#102033" },
  blond: { bg: "#643E86", fg: "#FFFFFF" },
  align3: { bg: "#3D6555", fg: "#FFFFFF" },
  finalizadores: { bg: "#B83890", fg: "#FFFFFF" },
  [SEM_LINHA]: { bg: "#27272A", fg: "#E4E4E7" },
};

export type GrupoLinha<T> = {
  id: string;
  label: string;
  items: T[];
};

const ORDEM_GRUPOS: { id: string; label: string }[] = [
  ...LINHAS_PRODUTO.map((l) => ({ id: l.value, label: l.label })),
  { id: SEM_LINHA, label: "Sem linha" },
];

export function resolverGrupoProduto(product: { linha?: string | null }): string {
  const linha = String(product?.linha || "").trim().toLowerCase();
  if (LINHAS_PRODUTO.some((l) => l.value === linha)) return linha;
  return SEM_LINHA;
}

export function agruparProdutosPorLinha<T extends { title?: string | null; linha?: string | null }>(
  produtos: T[]
): GrupoLinha<T>[] {
  const buckets = new Map<string, T[]>();
  ORDEM_GRUPOS.forEach((g) => buckets.set(g.id, []));

  for (const p of produtos) {
    const grupo = resolverGrupoProduto(p);
    buckets.get(grupo)?.push(p);
  }

  for (const lista of buckets.values()) {
    lista.sort((a, b) =>
      String(a.title ?? "").localeCompare(String(b.title ?? ""), "pt-BR", {
        numeric: true,
        sensitivity: "base",
      })
    );
  }

  return ORDEM_GRUPOS.map((g) => ({
    id: g.id,
    label: g.label,
    items: buckets.get(g.id) || [],
  })).filter((g) => g.items.length > 0);
}
