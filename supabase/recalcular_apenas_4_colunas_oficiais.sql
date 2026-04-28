-- =============================================================================
-- RECALCULO APENAS DAS 4 COLUNAS OFICIAIS
--
-- Colunas alvo:
--   1) personal_coins
--   2) network_coins
--   3) total_compras_proprias
--   4) total_compras_rede
--
-- Regra aplicada:
-- - personal_coins: mantém valor atual (apenas normaliza NULL -> 0)
-- - network_coins: mantém valor atual (apenas normaliza NULL -> 0)
-- - total_compras_proprias: soma das compras próprias em pedidos pagos
-- - total_compras_rede: soma das compras dos indicados diretos em pedidos pagos
--
-- Status pagos:
--   paid, separacao, despachado, entregue
-- =============================================================================

BEGIN;

SET LOCAL session_replication_role = replica;

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
  total_compras_rede = b.novo_total_compras_rede
FROM base b
WHERE p.id = b.id;

COMMIT;

-- Conferencia final (somente as 4 colunas)
SELECT
  p.id,
  p.full_name,
  COALESCE(p.personal_coins, 0) AS personal_coins,
  COALESCE(p.network_coins, 0) AS network_coins,
  COALESCE(p.total_compras_proprias, 0) AS total_compras_proprias,
  COALESCE(p.total_compras_rede, 0) AS total_compras_rede
FROM public.profiles p
ORDER BY p.full_name ASC;
