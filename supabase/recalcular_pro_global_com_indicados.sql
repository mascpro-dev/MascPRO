-- =============================================================================
-- RECÁLCULO GLOBAL DE PRO (todos os perfis)
--
-- Este script ACRESCENTA (modo aditivo):
-- 1) store_coins          += soma das compras próprias (pedidos pagos)
-- 2) total_compras_rede   += soma das compras dos indicados diretos (pedidos pagos)
-- 3) moedas_pro_acumuladas+= (compras próprias + compras da rede)
--
-- Regras usadas (status válidos de pedido):
--   paid, separacao, despachado, entregue
--
-- Observação importante:
-- - Usa ROUND(total) para manter a regra já aplicada no backend.
-- - Este script é ADITIVO e NÃO é idempotente (rodar duas vezes soma duas vezes).
-- =============================================================================

BEGIN;

-- Compatibilidade com ambientes legados
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_coins numeric NOT NULL DEFAULT 0;

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
    COALESCE(SUM(pv.valor_pro), 0)::numeric AS total_store_coins
  FROM pedidos_validos pv
  GROUP BY pv.profile_id
)
-- 1) Acrescenta compras próprias no comprador
UPDATE public.profiles p
SET
  store_coins = COALESCE(p.store_coins, 0) + COALESCE(cp.total_store_coins, 0),
  moedas_pro_acumuladas = COALESCE(p.moedas_pro_acumuladas, 0) + COALESCE(cp.total_store_coins, 0)
FROM compras_proprias cp
WHERE p.id = cp.profile_id;

-- 2) Acrescenta compras da rede no indicador direto
WITH pedidos_validos AS (
  SELECT
    o.profile_id,
    ROUND(COALESCE(o.total, 0))::numeric AS valor_pro
  FROM public.orders o
  WHERE o.profile_id IS NOT NULL
    AND LOWER(COALESCE(o.status, '')) IN ('paid', 'separacao', 'despachado', 'entregue')
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
  total_compras_rede = COALESCE(p.total_compras_rede, 0) + COALESCE(ci.total_rede, 0),
  moedas_pro_acumuladas = COALESCE(p.moedas_pro_acumuladas, 0) + COALESCE(ci.total_rede, 0)
FROM compras_indicados ci
WHERE p.id = ci.indicador_id;

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

