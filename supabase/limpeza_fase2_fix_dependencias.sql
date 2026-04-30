-- =============================================================================
-- FASE 2 — FIX DEPENDÊNCIAS + DROP COLUNAS LEGADAS PRO
--
-- Dependências encontradas (nenhuma usada no app):
--   - FUNÇÃO: add_pro_system  → usa coluna `coins` (função órfã, zero chamadas no app)
--   - VIEW:   v_pro_totals    → usa 'moedas_pro_acumuladas' só como alias (segura)
--   - VIEW:   v_ranking_global→ usa 'moedas_pro_acumuladas' só como alias (segura)
--
-- Ação:
--   1. Dropa a função órfã add_pro_system
--   2. Recria as views sem o alias legado
--   3. Dropa as colunas: coins, store_coins, passive_pro, moedas_pro_acumuladas
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) REMOVE a função órfã (não é chamada em nenhum lugar do app)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.add_pro_system CASCADE;

-- -----------------------------------------------------------------------------
-- 2) RECRIA as views sem o alias legado "moedas_pro_acumuladas"
--    (DROP antes porque o PostgreSQL não permite renomear coluna de view
--     com CREATE OR REPLACE — exige drop + recreate)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_pro_totals CASCADE;
DROP VIEW IF EXISTS public.v_ranking_global CASCADE;

CREATE VIEW public.v_pro_totals AS
SELECT
  p.id,
  p.full_name,
  COALESCE(p.personal_coins, 0)          AS personal_coins,
  COALESCE(p.network_coins, 0)           AS network_coins,
  COALESCE(p.total_compras_proprias, 0)  AS total_compras_proprias,
  COALESCE(p.total_compras_rede, 0)      AS total_compras_rede,
  COALESCE(p.pro_total, 0)              AS pro_total
FROM public.profiles p;

CREATE VIEW public.v_ranking_global AS
SELECT
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(p.pro_total, 0) DESC, p.full_name ASC NULLS LAST
  )                          AS posicao,
  p.id,
  p.full_name,
  COALESCE(p.pro_total, 0)  AS pro_total
FROM public.profiles p;

-- -----------------------------------------------------------------------------
-- 3) DROP das colunas legadas
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS coins,
  DROP COLUMN IF EXISTS store_coins,
  DROP COLUMN IF EXISTS passive_pro,
  DROP COLUMN IF EXISTS moedas_pro_acumuladas;

COMMIT;

-- -----------------------------------------------------------------------------
-- CONFERÊNCIA FINAL
-- -----------------------------------------------------------------------------
SELECT
  ordinal_position AS pos,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
ORDER BY ordinal_position;
