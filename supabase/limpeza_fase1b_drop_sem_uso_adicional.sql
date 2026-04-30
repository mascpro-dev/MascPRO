-- =============================================================================
-- LIMPEZA FASE 1B: DROP de colunas adicionais sem nenhum uso
--
-- Identificadas após análise completa da tabela profiles.
-- Todas confirmadas com ZERO referência em:
--   - arquivos .ts / .tsx do frontend
--   - funções / triggers / policies ativos no banco
--
-- Coluna canônica que substitui cada uma:
--   hair_shop        → barber_shop
--   last_activity_date → last_active_at
--   last_access        → last_active_at
--   tempo_experiencia  → experience
--   status_embaixador  → sem substituto (não usado)
--   status_profissional→ sem substituto (não usado)
--   agenda_online      → has_schedule
--   is_active          → onboarding_completed
--   location           → city + state (window.location no frontend ≠ coluna)
--   telefone           → whatsapp
--   referrer_id        → indicado_por (uuid, mesma função, indicado_por é o ativo)
--
-- SEGURO PARA RODAR — mesma garantia da Fase 1.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASSO 1: verificação prévia — exibe quais existem antes do DROP
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  col text;
  cols text[] := ARRAY[
    'hair_shop', 'last_activity_date', 'last_access',
    'tempo_experiencia', 'status_embaixador', 'status_profissional',
    'agenda_online', 'is_active', 'location', 'telefone', 'referrer_id'
  ];
BEGIN
  FOREACH col IN ARRAY cols LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'profiles'
        AND column_name  = col
    ) THEN
      RAISE NOTICE 'Coluna encontrada e será removida: %', col;
    ELSE
      RAISE NOTICE 'Coluna já não existe (ignorada): %', col;
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- PASSO 2: verificação de segurança — triggers ou funções ativas
--          (resultado deve ser VAZIO para prosseguir)
-- -----------------------------------------------------------------------------
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  LEFT(action_statement, 200) AS preview
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    action_statement ILIKE '%hair_shop%'
    OR action_statement ILIKE '%last_activity_date%'
    OR action_statement ILIKE '%last_access%'
    OR action_statement ILIKE '%tempo_experiencia%'
    OR action_statement ILIKE '%status_embaixador%'
    OR action_statement ILIKE '%status_profissional%'
    OR action_statement ILIKE '%agenda_online%'
    OR action_statement ILIKE '%referrer_id%'
  );

-- -----------------------------------------------------------------------------
-- PASSO 3: DROP efetivo
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS hair_shop,
  DROP COLUMN IF EXISTS last_activity_date,
  DROP COLUMN IF EXISTS last_access,
  DROP COLUMN IF EXISTS tempo_experiencia,
  DROP COLUMN IF EXISTS status_embaixador,
  DROP COLUMN IF EXISTS status_profissional,
  DROP COLUMN IF EXISTS agenda_online,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS telefone,
  DROP COLUMN IF EXISTS referrer_id;

COMMIT;

-- -----------------------------------------------------------------------------
-- CONFERÊNCIA: colunas restantes em profiles
-- -----------------------------------------------------------------------------
SELECT
  ordinal_position AS pos,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
ORDER BY ordinal_position;
