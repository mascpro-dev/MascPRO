-- ============================================================
-- Painel comercial — Fase 2: classificar sem perder histórico
-- Só ADD COLUMN + CHECK ampliado. Nunca DROP de tabela/dados.
-- Leads e produtos antigos ficam com os campos novos em NULL.
-- Rodar no SQL Editor do Supabase.
-- ============================================================

-- 1) Linha comercial no produto
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS linha TEXT;

COMMENT ON COLUMN public.products.linha IS
  'Linha MASC: daily, nutri, repair, scalp, curls, blond, align3. NULL = ainda sem classificar.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_linha_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_linha_check
      CHECK (
        linha IS NULL OR linha IN (
          'daily','nutri','repair','scalp','curls','blond','align3'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_linha_idx ON public.products(linha);

-- 2) Classificação do lead (todos nullable)
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS perfil TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS interesse TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS linha_interesse TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS dor TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS proximo_passo TEXT;

COMMENT ON COLUMN public.crm_leads.perfil IS
  'cliente_final, cabeleireiro, salao, embaixadora, distribuidor';
COMMENT ON COLUMN public.crm_leads.interesse IS
  'produto, home_care, align3, embaixadora, distribuicao, treinamento';
COMMENT ON COLUMN public.crm_leads.linha_interesse IS
  'Mesmos valores de products.linha';
COMMENT ON COLUMN public.crm_leads.dor IS
  'frizz, quebra, loiro, cachos, couro, ressecamento, venda, recompra';
COMMENT ON COLUMN public.crm_leads.proximo_passo IS
  'Texto livre. Proposta/negociação exigem isto ou data_followup.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_perfil_check') THEN
    ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_perfil_check
      CHECK (perfil IS NULL OR perfil IN (
        'cliente_final','cabeleireiro','salao','embaixadora','distribuidor'
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_interesse_check') THEN
    ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_interesse_check
      CHECK (interesse IS NULL OR interesse IN (
        'produto','home_care','align3','embaixadora','distribuicao','treinamento'
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_linha_interesse_check') THEN
    ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_linha_interesse_check
      CHECK (linha_interesse IS NULL OR linha_interesse IN (
        'daily','nutri','repair','scalp','curls','blond','align3'
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_dor_check') THEN
    ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_dor_check
      CHECK (dor IS NULL OR dor IN (
        'frizz','quebra','loiro','cachos','couro','ressecamento','venda','recompra'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS crm_leads_perfil_idx ON public.crm_leads(perfil);
CREATE INDEX IF NOT EXISTS crm_leads_linha_interesse_idx ON public.crm_leads(linha_interesse);

-- 3) Ampliar CHECK de status e origem (soma, não renomeia)
-- contato_feito continua = "Em atendimento"
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'crm_leads'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ~* '\mstatus\M'
      AND pg_get_constraintdef(c.oid) ILIKE '%contato_feito%'
      AND c.conname NOT IN (
        'crm_leads_perfil_check',
        'crm_leads_interesse_check',
        'crm_leads_linha_interesse_check',
        'crm_leads_dor_check'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;

  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'crm_leads'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ~* '\morigem\M'
      AND pg_get_constraintdef(c.oid) ILIKE '%instagram%'
      AND c.conname NOT IN (
        'crm_leads_perfil_check',
        'crm_leads_interesse_check',
        'crm_leads_linha_interesse_check',
        'crm_leads_dor_check'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_check;
ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_origem_check;

ALTER TABLE public.crm_leads
  ADD CONSTRAINT crm_leads_status_check
  CHECK (status IN (
    'novo',
    'contato_feito',
    'qualificado',
    'diagnostico',
    'proposta',
    'negociacao',
    'fechado',
    'perdido',
    'reativar',
    'nao_qualificado'
  ));

ALTER TABLE public.crm_leads
  ADD CONSTRAINT crm_leads_origem_check
  CHECK (
    origem IS NULL OR origem IN (
      'manual',
      'indicacao',
      'instagram',
      'whatsapp',
      'email',
      'evento',
      'outro',
      'distribuidor',
      'embaixadora',
      'trafego'
    )
  );
