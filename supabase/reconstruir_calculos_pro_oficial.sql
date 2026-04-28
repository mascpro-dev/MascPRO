-- =============================================================================
-- RECONSTRUCAO OFICIAL DOS CALCULOS PRO (IDEMPOTENTE)
--
-- Corrige discrepancias recalculando do ZERO apenas os campos derivados de pedidos:
--   - total_compras_proprias
--   - total_compras_rede
--   - pro_total
--   - nivel_tecnico
--
-- Nao soma colunas legadas (coins, passive_pro, store_coins, moedas_pro_acumuladas).
-- =============================================================================

BEGIN;

SET LOCAL session_replication_role = replica;

-- 0) Remove trigger/funcao legada que referencia coluna removida "coins"
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

-- 1) Snapshot antes (auditoria)
CREATE TEMP TABLE tmp_pro_antes AS
SELECT
  p.id,
  COALESCE(p.total_compras_proprias, 0) AS total_compras_proprias_antes,
  COALESCE(p.total_compras_rede, 0) AS total_compras_rede_antes,
  COALESCE(p.pro_total, 0) AS pro_total_antes
FROM public.profiles p;

-- 2) Reconstroi compras proprias e compras da rede a partir de orders
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

-- 3) Resumo final
SELECT
  COUNT(*) AS total_perfis,
  COUNT(*) FILTER (
    WHERE COALESCE(a.pro_total_antes, 0) <> COALESCE(p.pro_total, 0)
  ) AS perfis_com_pro_total_alterado,
  COUNT(*) FILTER (
    WHERE COALESCE(a.total_compras_proprias_antes, 0) <> COALESCE(p.total_compras_proprias, 0)
       OR COALESCE(a.total_compras_rede_antes, 0) <> COALESCE(p.total_compras_rede, 0)
  ) AS perfis_com_compras_recalculadas,
  COUNT(*) FILTER (
    WHERE COALESCE(p.pro_total, 0) <> (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      COALESCE(p.total_compras_proprias, 0) +
      COALESCE(p.total_compras_rede, 0)
    )
  ) AS divergentes_pos_reconstrucao
FROM public.profiles p
JOIN tmp_pro_antes a ON a.id = p.id;

COMMIT;

-- Top divergencias restantes (se houver)
SELECT
  p.id,
  p.full_name,
  COALESCE(p.personal_coins, 0) AS personal_coins,
  COALESCE(p.network_coins, 0) AS network_coins,
  COALESCE(p.total_compras_proprias, 0) AS total_compras_proprias,
  COALESCE(p.total_compras_rede, 0) AS total_compras_rede,
  COALESCE(p.pro_total, 0) AS pro_total,
  (
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    COALESCE(p.total_compras_proprias, 0) +
    COALESCE(p.total_compras_rede, 0)
  ) AS pro_total_esperado
FROM public.profiles p
WHERE COALESCE(p.pro_total, 0) <> (
  COALESCE(p.personal_coins, 0) +
  COALESCE(p.network_coins, 0) +
  COALESCE(p.total_compras_proprias, 0) +
  COALESCE(p.total_compras_rede, 0)
)
ORDER BY p.full_name ASC
LIMIT 50;
