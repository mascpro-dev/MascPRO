-- =============================================================================
-- LIMPEZA FASE 1: DROP de colunas sem nenhum uso
--
-- Colunas confirmadas como sem referência em:
--   - nenhum arquivo .ts / .tsx do frontend
--   - nenhuma função / trigger / policy ativa no banco
--   - nenhum script SQL funcional (apenas legado)
--
-- SEGURO PARA RODAR A QUALQUER MOMENTO.
-- Faça backup antes se preferir: SELECT * FROM public.profiles LIMIT 5;
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASSO 1: confirmar que as colunas existem antes de dropar
--          (evita erro se já foram removidas)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  col text;
  cols text[] := ARRAY[
    'tier', 'tier_status', 'requested_tier',
    'city_state',
    'profissao',
    'referral_code', 'ref_code'
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
-- PASSO 2: DROP efetivo
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS tier,
  DROP COLUMN IF EXISTS tier_status,
  DROP COLUMN IF EXISTS requested_tier,
  DROP COLUMN IF EXISTS city_state,
  DROP COLUMN IF EXISTS profissao,
  DROP COLUMN IF EXISTS referral_code,
  DROP COLUMN IF EXISTS ref_code;

COMMIT;

-- -----------------------------------------------------------------------------
-- CONFERÊNCIA: lista as colunas restantes de profiles
-- -----------------------------------------------------------------------------
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
ORDER BY ordinal_position;
