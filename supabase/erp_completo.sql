-- ============================================================
-- MascPRO — ERP Completo
-- Migrações: custo, tracking, deduplicação, returns, metas,
--            config, parcelas, audit_log, ordem_compra
-- ============================================================

-- ── 1. CUSTO UNITÁRIO NOS PRODUTOS ───────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(12,2) DEFAULT 0;

-- ── 2. RASTREAMENTO DE PEDIDOS ────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS codigo_rastreio   TEXT,
  ADD COLUMN IF NOT EXISTS transportadora    TEXT,
  ADD COLUMN IF NOT EXISTS data_previsao     DATE,
  ADD COLUMN IF NOT EXISTS parcelas          SMALLINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS valor_parcela     NUMERIC(12,2),
  -- Flags de idempotência (evitam dupla contagem)
  ADD COLUMN IF NOT EXISTS comissao_aplicada BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pro_aplicado      BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS orders_comissao_aplicada_idx ON orders(comissao_aplicada);
CREATE INDEX IF NOT EXISTS orders_pro_aplicado_idx      ON orders(pro_aplicado);

-- ── 3. DEVOLUÇÕES / TROCAS ────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  order_id      UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  profile_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  motivo        TEXT        NOT NULL,
  tipo          TEXT        NOT NULL DEFAULT 'devolucao'
    CHECK (tipo IN ('devolucao','troca','avaria')),
  status        TEXT        NOT NULL DEFAULT 'solicitado'
    CHECK (status IN ('solicitado','aprovado','rejeitado','concluido')),
  valor_estorno NUMERIC(12,2),
  observacao    TEXT,
  aprovado_por  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  aprovado_em   TIMESTAMPTZ,
  created_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS return_items (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id       UUID    NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id      UUID    REFERENCES products(id) ON DELETE SET NULL,
  order_item_id   UUID,
  quantidade      INTEGER NOT NULL DEFAULT 1,
  motivo_item     TEXT
);

DROP TRIGGER IF EXISTS returns_updated_at ON returns;
CREATE OR REPLACE FUNCTION returns_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE TRIGGER returns_updated_at
  BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION returns_set_updated_at();

ALTER TABLE returns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE returns      TO authenticated, service_role;
GRANT ALL ON TABLE return_items TO authenticated, service_role;

DROP POLICY IF EXISTS "returns_acesso" ON returns;
DROP POLICY IF EXISTS "return_items_acesso" ON return_items;
CREATE POLICY "returns_acesso" ON returns FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN','DISTRIBUIDOR'))
);
CREATE POLICY "return_items_acesso" ON return_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN','DISTRIBUIDOR'))
);

-- ── 4. METAS DE VENDAS POR DISTRIBUIDOR ──────────────────
CREATE TABLE IF NOT EXISTS distribuidor_metas (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  distribuidor_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  periodo         TEXT        NOT NULL, -- 'YYYY-MM'
  meta_leads      INTEGER     DEFAULT 0,
  meta_conversoes INTEGER     DEFAULT 0,
  meta_receita    NUMERIC(12,2) DEFAULT 0,
  UNIQUE(distribuidor_id, periodo)
);

ALTER TABLE distribuidor_metas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE distribuidor_metas TO authenticated, service_role;
DROP POLICY IF EXISTS "metas_acesso" ON distribuidor_metas;
CREATE POLICY "metas_acesso" ON distribuidor_metas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN','DISTRIBUIDOR'))
);

-- ── 5. CONFIGURAÇÕES GLOBAIS DO SISTEMA ──────────────────
CREATE TABLE IF NOT EXISTS system_config (
  chave       TEXT PRIMARY KEY,
  valor       TEXT NOT NULL,
  descricao   TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE system_config TO authenticated, service_role;
DROP POLICY IF EXISTS "config_admin" ON system_config;
CREATE POLICY "config_admin" ON system_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);

-- Valores padrão
INSERT INTO system_config (chave, valor, descricao) VALUES
  ('taxa_saque',           '11',    'Taxa de saque em % (ex: 11 = 11%)'),
  ('percentual_comissao',  '15',    'Percentual de comissão padrão em %'),
  ('percentual_comissao_cabeleireiro', '15', 'Percentual de comissão para indicador cabeleireiro em %'),
  ('frete_gratis_acima',   '1500',  'Valor mínimo em R$ para frete grátis'),
  ('estoque_alerta_min',   '5',     'Qtd mínima de estoque para alertar'),
  ('dias_cliente_risco',   '30',    'Dias sem compra para considerar cliente em risco')
ON CONFLICT (chave) DO NOTHING;

-- ── 6. AUDIT LOG ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  usuario_id  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  acao        TEXT        NOT NULL, -- 'UPDATE_ORDER','DELETE_LEAD','CHANGE_STATUS', etc
  entidade    TEXT        NOT NULL, -- 'orders','crm_leads','products', etc
  entidade_id TEXT,
  dados_antes JSONB,
  dados_apos  JSONB,
  ip          TEXT,
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS audit_log_usuario_idx   ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS audit_log_entidade_idx  ON audit_log(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx   ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE audit_log TO authenticated, service_role;
DROP POLICY IF EXISTS "audit_admin" ON audit_log;
CREATE POLICY "audit_admin" ON audit_log FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);

-- ── 7. ORDENS DE COMPRA (DISTRIBUIDOR → EMPRESA) ─────────
CREATE TABLE IF NOT EXISTS ordens_compra (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  numero          TEXT        UNIQUE,
  distribuidor_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','enviado','aprovado','em_separacao','despachado','entregue','cancelado')),
  observacao      TEXT,
  total_estimado  NUMERIC(12,2) DEFAULT 0,
  aprovado_por    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  aprovado_em     TIMESTAMPTZ,
  created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ordens_compra_itens (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_id        UUID        NOT NULL REFERENCES ordens_compra(id) ON DELETE CASCADE,
  product_id      UUID        REFERENCES products(id) ON DELETE SET NULL,
  quantidade      INTEGER     NOT NULL DEFAULT 1,
  preco_unitario  NUMERIC(12,2),
  subtotal        NUMERIC(12,2)
);

DROP TRIGGER IF EXISTS ordens_compra_updated_at ON ordens_compra;
CREATE OR REPLACE FUNCTION ordens_compra_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE TRIGGER ordens_compra_updated_at
  BEFORE UPDATE ON ordens_compra FOR EACH ROW EXECUTE FUNCTION ordens_compra_set_updated_at();

ALTER TABLE ordens_compra       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_compra_itens ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE ordens_compra       TO authenticated, service_role;
GRANT ALL ON TABLE ordens_compra_itens TO authenticated, service_role;

DROP POLICY IF EXISTS "ordens_compra_acesso" ON ordens_compra;
DROP POLICY IF EXISTS "ordens_compra_itens_acesso" ON ordens_compra_itens;
CREATE POLICY "ordens_compra_acesso" ON ordens_compra FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND (profiles.role = 'ADMIN' OR (profiles.role = 'DISTRIBUIDOR' AND ordens_compra.distribuidor_id = auth.uid())))
);
CREATE POLICY "ordens_compra_itens_acesso" ON ordens_compra_itens FOR ALL USING (
  EXISTS (
    SELECT 1 FROM ordens_compra oc
    JOIN profiles p ON p.id = auth.uid()
    WHERE oc.id = ordens_compra_itens.ordem_id
      AND (p.role = 'ADMIN' OR (p.role = 'DISTRIBUIDOR' AND oc.distribuidor_id = auth.uid()))
  )
);

-- Sequência para número da OC
CREATE SEQUENCE IF NOT EXISTS ordens_compra_seq START 1001;

-- ── 8. INTEGRAÇÃO BLING (estrutura para NF-e) ────────────
CREATE TABLE IF NOT EXISTS bling_config (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  api_token   TEXT,         -- Token API v3 do Bling
  cnpj        TEXT,
  ie          TEXT,         -- Inscrição Estadual
  regime      TEXT,         -- simples_nacional, lucro_presumido, etc.
  serie_nfe   TEXT DEFAULT '1',
  ambiente    TEXT DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao','producao')),
  ativo       BOOLEAN DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  order_id        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  bling_id        TEXT,         -- ID retornado pelo Bling
  numero_nfe      TEXT,
  serie           TEXT,
  chave_acesso    TEXT,
  status          TEXT DEFAULT 'pendente'
    CHECK (status IN ('pendente','emitida','cancelada','erro')),
  xml_url         TEXT,
  pdf_url         TEXT,
  error_msg       TEXT,
  emitido_por     UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE bling_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE bling_config  TO authenticated, service_role;
GRANT ALL ON TABLE notas_fiscais TO authenticated, service_role;

DROP POLICY IF EXISTS "bling_admin" ON bling_config;
DROP POLICY IF EXISTS "nfe_acesso" ON notas_fiscais;
CREATE POLICY "bling_admin"  ON bling_config  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "nfe_acesso"   ON notas_fiscais FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN','DISTRIBUIDOR')));
