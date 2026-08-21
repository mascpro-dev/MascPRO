-- ============================================================
-- CRM Vendedor — Visitas em campo + Metas individuais
-- Rodar no SQL Editor do Supabase (após crm_vendedor_equipe.sql)
-- ============================================================

-- Relatório de visitas / demo / amostra
CREATE TABLE IF NOT EXISTS crm_visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  distribuidor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  crm_lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('visita', 'demo', 'amostra', 'followup')),
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT,
  cliente_cidade TEXT,
  data_visita TIMESTAMPTZ NOT NULL DEFAULT now(),
  produtos_amostra TEXT,
  resultado TEXT CHECK (resultado IS NULL OR resultado IN ('positivo', 'neutro', 'negativo', 'reagendar')),
  proximo_passo TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_visitas_vendedor ON crm_visitas(vendedor_id, data_visita DESC);
CREATE INDEX IF NOT EXISTS idx_crm_visitas_distribuidor ON crm_visitas(distribuidor_id, data_visita DESC);

-- Metas individuais por vendedor (definidas pelo distribuidor)
CREATE TABLE IF NOT EXISTS vendedor_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  distribuidor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  meta_leads INT NOT NULL DEFAULT 0,
  meta_visitas INT NOT NULL DEFAULT 0,
  meta_conversoes INT NOT NULL DEFAULT 0,
  meta_receita NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendedor_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_vendedor_metas_distribuidor ON vendedor_metas(distribuidor_id, periodo);
