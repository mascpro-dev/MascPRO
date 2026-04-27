-- =============================================================================
-- Recalcula compras próprias da loja para TODOS os perfis
-- Campo alvo oficial: public.profiles.total_compras_proprias
-- (mantém store_coins sincronizado por compatibilidade legado)
--
-- Regras:
-- - Soma pedidos com status considerados pagos/confirmados:
--   paid, separacao, despachado, entregue
-- - Usa ROUND(total) para manter a mesma lógica do backend
-- - Script idempotente: pode rodar mais de uma vez sem duplicar crédito
-- =============================================================================

BEGIN;

-- Garante coluna existente (projetos legados podem não ter)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_compras_proprias numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_coins numeric NOT NULL DEFAULT 0;

WITH totais AS (
  SELECT
    o.profile_id,
    COALESCE(SUM(ROUND(COALESCE(o.total, 0))), 0) AS total_compras_proprias
  FROM public.orders o
  WHERE o.profile_id IS NOT NULL
    AND LOWER(COALESCE(o.status, '')) IN ('paid', 'separacao', 'despachado', 'entregue')
  GROUP BY o.profile_id
)
UPDATE public.profiles p
SET
  total_compras_proprias = COALESCE(t.total_compras_proprias, 0),
  store_coins = COALESCE(t.total_compras_proprias, 0)
FROM totais t
WHERE p.id = t.profile_id;

-- Perfis sem compra válida ficam zerados para manter consistência global
UPDATE public.profiles p
SET
  total_compras_proprias = 0,
  store_coins = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orders o
  WHERE o.profile_id = p.id
    AND LOWER(COALESCE(o.status, '')) IN ('paid', 'separacao', 'despachado', 'entregue')
);

COMMIT;

-- Conferência rápida (top 50)
SELECT
  p.id,
  p.full_name,
  p.total_compras_proprias,
  p.store_coins
FROM public.profiles p
ORDER BY p.total_compras_proprias DESC, p.full_name ASC
LIMIT 50;

