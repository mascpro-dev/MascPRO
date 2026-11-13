export type ProdutoTecnico = {
  id: string;
  nome: string;
  imagens: string[];
  descricao?: string;
};

/** Produtos e fotos do catálogo técnico da Força. As imagens ficam em public/. */
export const PRODUTOS_TECNICOS: ProdutoTecnico[] = [];
