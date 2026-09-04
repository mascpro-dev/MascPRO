-- ============================================================
-- FIX: permission denied for table crm_visitas
-- Rode UMA VEZ no SQL Editor do Supabase.
-- ============================================================

-- Garante tabelas (idempotente)
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

CREATE INDEX IF NOT EXISTS idx_crm_visitas_vendedor ON crm_visitas(vendedor_id, data_visita DESC);
CREATE INDEX IF NOT EXISTS idx_crm_visitas_distribuidor ON crm_visitas(distribuidor_id, data_visita DESC);
CREATE INDEX IF NOT EXISTS idx_vendedor_metas_distribuidor ON vendedor_metas(distribuidor_id, periodo);

-- Permissões (sem isso → "permission denied for table crm_visitas")
GRANT ALL ON TABLE public.crm_visitas TO authenticated;
GRANT ALL ON TABLE public.crm_visitas TO service_role;
GRANT ALL ON TABLE public.crm_visitas TO anon;

GRANT ALL ON TABLE public.vendedor_metas TO authenticated;
GRANT ALL ON TABLE public.vendedor_metas TO service_role;
GRANT ALL ON TABLE public.vendedor_metas TO anon;

-- RLS: vendedor vê/insere as próprias; distribuidor vê a equipe; admin vê tudo
ALTER TABLE public.crm_visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendedor_metas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_visitas_select ON public.crm_visitas;
DROP POLICY IF EXISTS crm_visitas_insert ON public.crm_visitas;
DROP POLICY IF EXISTS crm_visitas_update ON public.crm_visitas;
DROP POLICY IF EXISTS crm_visitas_delete ON public.crm_visitas;

CREATE POLICY crm_visitas_select ON public.crm_visitas
  FOR SELECT TO authenticated
  USING (
    vendedor_id = auth.uid()
    OR distribuidor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND UPPER(p.role) = 'ADMIN'
    )
  );

CREATE POLICY crm_visitas_insert ON public.crm_visitas
  FOR INSERT TO authenticated
  WITH CHECK (
    vendedor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND UPPER(p.role) IN ('ADMIN', 'DISTRIBUIDOR')
    )
  );

CREATE POLICY crm_visitas_update ON public.crm_visitas
  FOR UPDATE TO authenticated
  USING (
    vendedor_id = auth.uid()
    OR distribuidor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND UPPER(p.role) = 'ADMIN'
    )
  );

CREATE POLICY crm_visitas_delete ON public.crm_visitas
  FOR DELETE TO authenticated
  USING (
    vendedor_id = auth.uid()
    OR distribuidor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND UPPER(p.role) = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS vendedor_metas_select ON public.vendedor_metas;
DROP POLICY IF EXISTS vendedor_metas_write ON public.vendedor_metas;

CREATE POLICY vendedor_metas_select ON public.vendedor_metas
  FOR SELECT TO authenticated
  USING (
    vendedor_id = auth.uid()
    OR distribuidor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND UPPER(p.role) = 'ADMIN'
    )
  );

CREATE POLICY vendedor_metas_write ON public.vendedor_metas
  FOR ALL TO authenticated
  USING (
    distribuidor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND UPPER(p.role) = 'ADMIN'
    )
  )
  WITH CHECK (
    distribuidor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND UPPER(p.role) = 'ADMIN'
    )
  );

-- Conferência
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'crm_visitas'
ORDER BY grantee, privilege_type;
