-- ============================================================
-- CRM Equipe de Vendedores (distribuidor)
-- Rodar no SQL Editor do Supabase
-- ============================================================

-- Tabela de preços por distribuidor (base cabeleireira, faixa min/final)
CREATE TABLE IF NOT EXISTS distribuidor_tabela_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuidor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  preco_final NUMERIC(12,2) NOT NULL CHECK (preco_final >= 0),
  preco_minimo NUMERIC(12,2) NOT NULL CHECK (preco_minimo >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (distribuidor_id, product_id),
  CHECK (preco_minimo <= preco_final)
);

CREATE INDEX IF NOT EXISTS idx_dist_tabela_distribuidor
  ON distribuidor_tabela_precos(distribuidor_id);

-- Faixas de comissão crescente (configuradas pelo distribuidor)
CREATE TABLE IF NOT EXISTS distribuidor_comissao_faixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuidor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  venda_de NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (venda_de >= 0),
  venda_ate NUMERIC(12,2) CHECK (venda_ate IS NULL OR venda_ate >= venda_de),
  percentual NUMERIC(5,2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (distribuidor_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_dist_comissao_distribuidor
  ON distribuidor_comissao_faixas(distribuidor_id, ordem);

-- Extensões em pedidos (vendedor + aprovação + consignado)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aprovacao_status TEXT
    CHECK (aprovacao_status IS NULL OR aprovacao_status IN ('pendente', 'aprovado', 'rejeitado')),
  ADD COLUMN IF NOT EXISTS aprovacao_motivo TEXT,
  ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS excluir_meta BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluir_comissao BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS desconto_total NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_vendedor ON orders(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_orders_aprovacao ON orders(aprovacao_status)
  WHERE aprovacao_status = 'pendente';

-- Itens bonificados / preço praticado
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS preco_tabela NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS bonificado BOOLEAN NOT NULL DEFAULT false;

-- Comissão do vendedor (separada da comissão embaixador)
CREATE TABLE IF NOT EXISTS vendedor_comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  distribuidor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  valor_pedido NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor_comissao NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'disponivel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_vendedor_comissoes_vendedor
  ON vendedor_comissoes(vendedor_id, created_at DESC);
