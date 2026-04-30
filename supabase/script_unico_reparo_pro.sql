-- =============================================================================
-- SCRIPT UNICO DE REPARO PRO (ALL-IN-ONE)
--
-- Faz em uma unica execucao:
-- 1) Remove trigger/funcao legada que quebra calculo (sync_coins_for_ranking)
-- 2) Recalcula FORCADO as 4 colunas oficiais:
--    - personal_coins (normaliza NULL -> 0)
--    - network_coins (normaliza NULL -> 0)
--    - total_compras_proprias (recalculada por pedidos pagos)
--    - total_compras_rede (recalculada por pedidos dos indicados diretos)
-- 3) Recalcula pro_total e nivel_tecnico para refletir no app/ranking
-- 4) Mostra resumo de alteracoes e divergencias finais
--
-- Status considerados pagos:
--   paid, separacao, despachado, entregue
-- =============================================================================

BEGIN;

SET LOCAL session_replication_role = replica;

-- 0) Garantia de colunas oficiais
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personal_coins numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS network_coins numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_compras_proprias numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_compras_rede numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_total numeric NOT NULL DEFAULT 0;

-- 1) Remove legado que pode sobrescrever/calcular errado
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
      AND p.proname = 'sync_coins_for_ranking'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I',
      r.trigger_name,
      r.schema_name,
      r.table_name
    );
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.sync_coins_for_ranking();

-- 2) Snapshot antes
CREATE TEMP TABLE tmp_pro_before AS
SELECT
  p.id,
  COALESCE(p.personal_coins, 0) AS personal_coins_before,
  COALESCE(p.network_coins, 0) AS network_coins_before,
  COALESCE(p.total_compras_proprias, 0) AS total_compras_proprias_before,
  COALESCE(p.total_compras_rede, 0) AS total_compras_rede_before,
  COALESCE(p.pro_total, 0) AS pro_total_before
FROM public.profiles p;

-- 3) Recalculo forcado das colunas oficiais
WITH pedidos_validos AS (
  SELECT
    o.profile_id,
    ROUND(COALESCE(o.total, 0))::numeric AS valor_pro
  FROM public.orders o
  WHERE o.profile_id IS NOT NULL
    AND LOWER(COALESCE(o.status, '')) IN ('paid', 'separacao', 'despachado', 'entregue')
),
compras_proprias AS (
  SELECT
    pv.profile_id,
    COALESCE(SUM(pv.valor_pro), 0)::numeric AS novo_total_compras_proprias
  FROM pedidos_validos pv
  GROUP BY pv.profile_id
),
compras_indicados AS (
  SELECT
    p_indicador.id AS indicador_id,
    COALESCE(SUM(pv.valor_pro), 0)::numeric AS novo_total_compras_rede
  FROM pedidos_validos pv
  JOIN public.profiles p_comprador
    ON p_comprador.id = pv.profile_id
  JOIN public.profiles p_indicador
    ON p_indicador.id = p_comprador.indicado_por
  GROUP BY p_indicador.id
),
base AS (
  SELECT
    p.id,
    COALESCE(cp.novo_total_compras_proprias, 0)::numeric AS novo_total_compras_proprias,
    COALESCE(ci.novo_total_compras_rede, 0)::numeric AS novo_total_compras_rede
  FROM public.profiles p
  LEFT JOIN compras_proprias cp ON cp.profile_id = p.id
  LEFT JOIN compras_indicados ci ON ci.indicador_id = p.id
)
UPDATE public.profiles p
SET
  personal_coins = COALESCE(p.personal_coins, 0),
  network_coins = COALESCE(p.network_coins, 0),
  total_compras_proprias = b.novo_total_compras_proprias,
  total_compras_rede = b.novo_total_compras_rede,
  pro_total =
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    b.novo_total_compras_proprias +
    b.novo_total_compras_rede,
  nivel_tecnico = CASE
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      b.novo_total_compras_proprias +
      b.novo_total_compras_rede
    ) >= 500001 THEN 'PROFISSIONAL BLACK'
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      b.novo_total_compras_proprias +
      b.novo_total_compras_rede
    ) >= 150001 THEN 'PROFISSIONAL GOLD'
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      b.novo_total_compras_proprias +
      b.novo_total_compras_rede
    ) >= 50001 THEN 'PROFISSIONAL PRATA'
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      b.novo_total_compras_proprias +
      b.novo_total_compras_rede
    ) >= 10001 THEN 'PROFISSIONAL BRONZE'
    ELSE 'INICIANTE'
  END
FROM base b
WHERE p.id = b.id;

COMMIT;

-- 4) Resumo do que mudou
SELECT
  COUNT(*) AS total_perfis,
  COUNT(*) FILTER (
    WHERE b.personal_coins_before <> COALESCE(p.personal_coins, 0)
  ) AS alterou_personal_coins,
  COUNT(*) FILTER (
    WHERE b.network_coins_before <> COALESCE(p.network_coins, 0)
  ) AS alterou_network_coins,
  COUNT(*) FILTER (
    WHERE b.total_compras_proprias_before <> COALESCE(p.total_compras_proprias, 0)
  ) AS alterou_total_compras_proprias,
  COUNT(*) FILTER (
    WHERE b.total_compras_rede_before <> COALESCE(p.total_compras_rede, 0)
  ) AS alterou_total_compras_rede,
  COUNT(*) FILTER (
    WHERE b.pro_total_before <> COALESCE(p.pro_total, 0)
  ) AS alterou_pro_total
FROM public.profiles p
JOIN tmp_pro_before b ON b.id = p.id;

-- 5) Auditoria final (deve ficar 0)
SELECT
  COUNT(*) AS divergentes_finais
FROM public.profiles p
WHERE COALESCE(p.pro_total, 0) <> (
  COALESCE(p.personal_coins, 0) +
  COALESCE(p.network_coins, 0) +
  COALESCE(p.total_compras_proprias, 0) +
  COALESCE(p.total_compras_rede, 0)
);
