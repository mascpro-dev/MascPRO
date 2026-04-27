-- =============================================================================
-- RECÁLCULO GLOBAL DE PRO (todos os perfis)
--
-- Este script recalcula, de forma idempotente:
-- 1) store_coins          = soma das compras próprias (pedidos pagos)
-- 2) total_compras_rede   = soma das compras dos indicados diretos (pedidos pagos)
-- 3) moedas_pro_acumuladas= total consolidado para ranking
--
-- Regras usadas (status válidos de pedido):
--   paid, separacao, despachado, entregue
--
-- Fórmula final:
--   moedas_pro_acumuladas =
--     personal_coins + network_coins + store_coins + total_compras_rede
--
-- Observação:
-- - Usa ROUND(total) para manter a regra já aplicada no backend.
-- - Pode ser executado múltiplas vezes sem duplicar crédito.
-- =============================================================================

BEGIN;

-- Compatibilidade com ambientes legados
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_coins numeric NOT NULL DEFAULT 0;

WITH pedidos_validos AS (
  SELECT
    o.id,
    o.profile_id,
    ROUND(COALESCE(o.total, 0))::numeric AS valor_pro
  FROM public.orders o
  WHERE o.profile_id IS NOT NULL
    AND LOWER(COALESCE(o.status, '')) IN ('paid', 'separacao', 'despachado', 'entregue')
),
compras_proprias AS (
  SELECT
    pv.profile_id,
    COALESCE(SUM(pv.valor_pro), 0)::numeric AS total_store_coins
  FROM pedidos_validos pv
  GROUP BY pv.profile_id
),
compras_indicados AS (
  SELECT
    p_indicador.id AS indicador_id,
    COALESCE(SUM(pv.valor_pro), 0)::numeric AS total_rede
  FROM pedidos_validos pv
  JOIN public.profiles p_comprador
    ON p_comprador.id = pv.profile_id
  JOIN public.profiles p_indicador
    ON p_indicador.id = p_comprador.indicado_por
  GROUP BY p_indicador.id
)
UPDATE public.profiles p
SET
  store_coins = COALESCE(cp.total_store_coins, 0),
  total_compras_rede = COALESCE(ci.total_rede, 0),
  moedas_pro_acumuladas =
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    COALESCE(cp.total_store_coins, 0) +
    COALESCE(ci.total_rede, 0)
FROM compras_proprias cp
FULL OUTER JOIN compras_indicados ci
  ON ci.indicador_id = cp.profile_id
WHERE p.id = COALESCE(cp.profile_id, ci.indicador_id);

-- Perfis que não entraram no UPDATE acima também precisam ficar consistentes
UPDATE public.profiles p
SET
  store_coins = COALESCE(p.store_coins, 0),
  total_compras_rede = COALESCE(p.total_compras_rede, 0),
  moedas_pro_acumuladas =
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    COALESCE(p.store_coins, 0) +
    COALESCE(p.total_compras_rede, 0)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orders o
  WHERE o.profile_id = p.id
    AND LOWER(COALESCE(o.status, '')) IN ('paid', 'separacao', 'despachado', 'entregue')
)
AND NOT EXISTS (
  SELECT 1
  FROM public.profiles f
  WHERE f.indicado_por = p.id
);

COMMIT;

-- Conferência rápida
SELECT
  p.id,
  p.full_name,
  p.personal_coins,
  p.network_coins,
  p.store_coins,
  p.total_compras_rede,
  p.moedas_pro_acumuladas
FROM public.profiles p
ORDER BY p.moedas_pro_acumuladas DESC, p.full_name ASC
LIMIT 100;

