-- ============================================================
-- CRM Interno MascPRO
-- Tabelas: crm_leads, crm_atividades
-- Acesso: ADMIN e DISTRIBUIDOR
-- ============================================================

-- Tabela principal de leads
CREATE TABLE IF NOT EXISTS crm_leads (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Dados do lead
  nome          TEXT        NOT NULL,
  empresa       TEXT,
  telefone      TEXT,
  email         TEXT,
  instagram     TEXT,
  cidade        TEXT,
  estado        TEXT,

  -- Pipeline
  status        TEXT        NOT NULL DEFAULT 'novo'
    CHECK (status IN ('novo','contato_feito','proposta','negociacao','fechado','perdido')),

  -- Origem
  origem        TEXT        DEFAULT 'manual'
    CHECK (origem IN ('manual','indicacao','instagram','whatsapp','email','evento','outro')),

  -- Valor estimado do negócio
  valor_estimado NUMERIC(12,2),

  -- Próximo follow-up
  data_followup  DATE,

  -- Notas rápidas
  notas         TEXT,

  -- Quem é o responsável pelo lead
  responsavel_id UUID       REFERENCES profiles(id) ON DELETE SET NULL,

  -- Quem criou
  created_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION crm_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_leads_updated_at ON crm_leads;
CREATE TRIGGER crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW EXECUTE FUNCTION crm_set_updated_at();

-- Tabela de atividades/histórico (linha do tempo do lead)
CREATE TABLE IF NOT EXISTS crm_atividades (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  lead_id         UUID        NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  autor_id        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  tipo            TEXT        NOT NULL
    CHECK (tipo IN ('nota','status_change','contato','followup','criacao')),
  conteudo        TEXT        NOT NULL,
  -- Para mudanças de status: guarda anterior e novo
  status_anterior TEXT,
  status_novo     TEXT
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS crm_leads_status_idx         ON crm_leads(status);
CREATE INDEX IF NOT EXISTS crm_leads_responsavel_idx    ON crm_leads(responsavel_id);
CREATE INDEX IF NOT EXISTS crm_leads_followup_idx       ON crm_leads(data_followup);
CREATE INDEX IF NOT EXISTS crm_atividades_lead_idx      ON crm_atividades(lead_id);
CREATE INDEX IF NOT EXISTS crm_atividades_created_idx   ON crm_atividades(created_at DESC);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
ALTER TABLE crm_leads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_atividades  ENABLE ROW LEVEL SECURITY;

-- Somente ADMIN e DISTRIBUIDOR têm acesso
DROP POLICY IF EXISTS "crm_leads_acesso"      ON crm_leads;
DROP POLICY IF EXISTS "crm_atividades_acesso" ON crm_atividades;

CREATE POLICY "crm_leads_acesso" ON crm_leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADMIN','DISTRIBUIDOR')
    )
  );

CREATE POLICY "crm_atividades_acesso" ON crm_atividades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADMIN','DISTRIBUIDOR')
    )
  );
