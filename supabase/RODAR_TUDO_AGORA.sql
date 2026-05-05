-- ============================================================
-- RODE ESTE ARQUIVO NO SUPABASE SQL EDITOR
-- Contém TODAS as colunas necessárias para o sistema funcionar
-- É seguro rodar várias vezes (usa IF NOT EXISTS)
-- ============================================================

-- ── 1. Coluna que corrige o erro de estoque no despacho ────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estoque_baixa_aplicada     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estoque_recebimento_aplicado BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_estoque_baixa_aplicada
  ON public.orders (estoque_baixa_aplicada);

-- ── 2. Deduplicação de comissões e PRO coins ───────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS comissao_aplicada BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pro_aplicado      BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS orders_comissao_aplicada_idx ON orders(comissao_aplicada);
CREATE INDEX IF NOT EXISTS orders_pro_aplicado_idx      ON orders(pro_aplicado);

-- ── 3. Rastreamento logístico ──────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS codigo_rastreio   TEXT,
  ADD COLUMN IF NOT EXISTS transportadora    TEXT,
  ADD COLUMN IF NOT EXISTS data_previsao     DATE,
  ADD COLUMN IF NOT EXISTS parcelas          SMALLINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS valor_parcela     NUMERIC(12,2);

-- ── 4. Custo unitário dos produtos ────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS custo_unitario    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bling_produto_id  TEXT;

-- ── 5. CPF/CNPJ e endereço nos perfis ─────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cpf_cnpj    TEXT,
  ADD COLUMN IF NOT EXISTS cep         TEXT,
  ADD COLUMN IF NOT EXISTS logradouro  TEXT,
  ADD COLUMN IF NOT EXISTS numero      TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro      TEXT,
  ADD COLUMN IF NOT EXISTS municipio   TEXT,
  ADD COLUMN IF NOT EXISTS uf          TEXT;

CREATE INDEX IF NOT EXISTS profiles_cpf_cnpj_idx ON profiles(cpf_cnpj);

-- ── 6. Devoluções ─────────────────────────────────────────
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
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id     UUID    NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id    UUID    REFERENCES products(id) ON DELETE SET NULL,
  quantidade    INTEGER NOT NULL DEFAULT 1,
  motivo_item   TEXT
);

ALTER TABLE returns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE returns      TO authenticated, service_role;
GRANT ALL ON TABLE return_items TO authenticated, service_role;

DROP POLICY IF EXISTS "returns_acesso"      ON returns;
DROP POLICY IF EXISTS "return_items_acesso" ON return_items;

CREATE POLICY "returns_acesso" ON returns FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN','DISTRIBUIDOR'))
);
CREATE POLICY "return_items_acesso" ON return_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN','DISTRIBUIDOR'))
);

-- ── 7. Metas de vendas ────────────────────────────────────
CREATE TABLE IF NOT EXISTS distribuidor_metas (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  distribuidor_id UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  periodo         TEXT          NOT NULL,
  meta_leads      INTEGER       DEFAULT 0,
  meta_conversoes INTEGER       DEFAULT 0,
  meta_receita    NUMERIC(12,2) DEFAULT 0,
  UNIQUE(distribuidor_id, periodo)
);

ALTER TABLE distribuidor_metas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE distribuidor_metas TO authenticated, service_role;
DROP POLICY IF EXISTS "metas_acesso" ON distribuidor_metas;
CREATE POLICY "metas_acesso" ON distribuidor_metas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN','DISTRIBUIDOR'))
);

-- ── 8. Configurações globais ──────────────────────────────
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

INSERT INTO system_config (chave, valor, descricao) VALUES
  ('correios_cep_origem',  '',      'CEP de origem da loja para cálculo de frete Correios (8 dígitos)'),
  ('taxa_saque',           '11',    'Taxa de saque em %'),
  ('percentual_comissao',  '15',    'Percentual de comissão padrão em %'),
  ('percentual_comissao_cabeleireiro', '15', 'Percentual de comissão para indicador cabeleireiro em %'),
  ('frete_gratis_acima',   '1500',  'Valor mínimo em R$ para frete grátis'),
  ('estoque_alerta_min',   '5',     'Qtd mínima de estoque para alertar'),
  ('dias_cliente_risco',   '30',    'Dias sem compra para cliente em risco')
ON CONFLICT (chave) DO NOTHING;

-- ── 9. Audit Log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  usuario_id  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  acao        TEXT        NOT NULL,
  entidade    TEXT        NOT NULL,
  entidade_id TEXT,
  dados_antes JSONB,
  dados_apos  JSONB,
  ip          TEXT,
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS audit_log_usuario_idx  ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS audit_log_entidade_idx ON audit_log(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx  ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE audit_log TO authenticated, service_role;
DROP POLICY IF EXISTS "audit_admin" ON audit_log;
CREATE POLICY "audit_admin" ON audit_log FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);

-- ── 10. CRM Leads ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_leads (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  nome          TEXT        NOT NULL,
  empresa       TEXT,
  telefone      TEXT,
  email         TEXT,
  instagram     TEXT,
  cidade        TEXT,
  estado        TEXT,
  status        TEXT        NOT NULL DEFAULT 'novo'
    CHECK (status IN ('novo','contato_feito','proposta','negociacao','fechado','perdido')),
  origem        TEXT        DEFAULT 'manual'
    CHECK (origem IN ('manual','indicacao','instagram','whatsapp','email','evento','outro')),
  valor_estimado  NUMERIC(12,2),
  data_followup   DATE,
  notas           TEXT,
  responsavel_id  UUID       REFERENCES profiles(id) ON DELETE SET NULL,
  created_by      UUID       REFERENCES profiles(id) ON DELETE SET NULL,
  profile_id      UUID       REFERENCES profiles(id) ON DELETE SET NULL,
  convertido_em   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm_atividades (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  lead_id         UUID        NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  autor_id        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  tipo            TEXT        NOT NULL
    CHECK (tipo IN ('nota','contato','followup','criacao','status_change')),
  conteudo        TEXT        NOT NULL,
  status_anterior TEXT,
  status_novo     TEXT
);

CREATE INDEX IF NOT EXISTS crm_leads_status_idx      ON crm_leads(status);
CREATE INDEX IF NOT EXISTS crm_leads_responsavel_idx ON crm_leads(responsavel_id);
CREATE INDEX IF NOT EXISTS crm_leads_followup_idx    ON crm_leads(data_followup);
CREATE INDEX IF NOT EXISTS crm_leads_profile_id_idx  ON crm_leads(profile_id);
CREATE INDEX IF NOT EXISTS crm_atividades_lead_idx   ON crm_atividades(lead_id);

ALTER TABLE crm_leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_atividades ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE crm_leads      TO authenticated, service_role;
GRANT ALL ON TABLE crm_atividades TO authenticated, service_role;

DROP POLICY IF EXISTS "crm_leads_acesso"      ON crm_leads;
DROP POLICY IF EXISTS "crm_atividades_acesso" ON crm_atividades;

CREATE POLICY "crm_leads_acesso" ON crm_leads FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
  OR (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'DISTRIBUIDOR')
    AND (
      crm_leads.created_by = auth.uid() OR crm_leads.responsavel_id = auth.uid()
      OR crm_leads.responsavel_id IN (SELECT id FROM profiles WHERE indicado_por = auth.uid())
      OR crm_leads.created_by     IN (SELECT id FROM profiles WHERE indicado_por = auth.uid())
    )
  )
);

CREATE POLICY "crm_atividades_acesso" ON crm_atividades FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
  OR (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'DISTRIBUIDOR')
    AND crm_atividades.lead_id IN (
      SELECT id FROM crm_leads WHERE
        created_by = auth.uid() OR responsavel_id = auth.uid()
        OR responsavel_id IN (SELECT id FROM profiles WHERE indicado_por = auth.uid())
        OR created_by     IN (SELECT id FROM profiles WHERE indicado_por = auth.uid())
    )
  )
);

-- ── 11. Metas de vendas ───────────────────────────────────
CREATE TABLE IF NOT EXISTS distribuidor_metas (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  distribuidor_id UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  periodo         TEXT          NOT NULL,
  meta_leads      INTEGER       DEFAULT 0,
  meta_conversoes INTEGER       DEFAULT 0,
  meta_receita    NUMERIC(12,2) DEFAULT 0,
  UNIQUE(distribuidor_id, periodo)
);

-- ── 12. NF-e via Bling ────────────────────────────────────
CREATE TABLE IF NOT EXISTS bling_config (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  api_token   TEXT,
  cnpj        TEXT,
  ie          TEXT,
  regime      TEXT,
  serie_nfe   TEXT DEFAULT '1',
  natureza_operacao TEXT DEFAULT 'Venda de mercadoria',
  cfop_padrao       TEXT DEFAULT '5102',
  ambiente    TEXT DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao','producao')),
  ativo       BOOLEAN DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  order_id        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  bling_id        TEXT,
  numero_nfe      TEXT,
  serie           TEXT,
  chave_acesso    TEXT,
  status          TEXT DEFAULT 'pendente'
    CHECK (status IN ('pendente','emitida','cancelada','erro')),
  xml_url         TEXT,
  pdf_url         TEXT,
  error_msg       TEXT,
  emitido_por     UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS notas_fiscais_order_id_idx ON notas_fiscais(order_id);
CREATE INDEX IF NOT EXISTS notas_fiscais_status_idx   ON notas_fiscais(status);

ALTER TABLE bling_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE bling_config  TO authenticated, service_role;
GRANT ALL ON TABLE notas_fiscais TO authenticated, service_role;

DROP POLICY IF EXISTS "bling_admin" ON bling_config;
DROP POLICY IF EXISTS "nfe_acesso"  ON notas_fiscais;

CREATE POLICY "bling_admin" ON bling_config  FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);
CREATE POLICY "nfe_acesso" ON notas_fiscais FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN','DISTRIBUIDOR'))
);

-- ── 13. Ordens de compra (distribuidor → empresa) ─────────
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
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_id       UUID        NOT NULL REFERENCES ordens_compra(id) ON DELETE CASCADE,
  product_id     UUID        REFERENCES products(id) ON DELETE SET NULL,
  quantidade     INTEGER     NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2),
  subtotal       NUMERIC(12,2)
);

ALTER TABLE ordens_compra       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_compra_itens ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE ordens_compra       TO authenticated, service_role;
GRANT ALL ON TABLE ordens_compra_itens TO authenticated, service_role;

DROP POLICY IF EXISTS "ordens_compra_acesso"       ON ordens_compra;
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
