-- =============================================================================
-- RECALCULAR PONTOS DE REDE (total_compras_rede) + FLAG pro_rede_aplicado
--
-- Regra:
--   Cada pedido pago do indicado direto soma ROUND(total) no total_compras_rede
--   do indicador (profiles.indicado_por).
--
-- Status pagos: paid, separacao, despachado, entregue
-- =============================================================================

BEGIN;

SET LOCAL session_replication_role = replica;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pro_rede_aplicado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS orders_pro_rede_aplicado_idx ON public.orders(pro_rede_aplicado);

-- Recalcula total_compras_rede do zero (idempotente)
WITH pedidos_validos AS (
  SELECT
    o.id AS order_id,
    o.profile_id,
    ROUND(COALESCE(o.total, 0))::numeric AS valor_pro
  FROM public.orders o
  WHERE o.profile_id IS NOT NULL
    AND LOWER(COALESCE(o.status, '')) IN ('paid', 'separacao', 'despachado', 'entregue')
    AND COALESCE(o.excluir_comissao, FALSE) = FALSE
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
    COALESCE(ci.novo_total_compras_rede, 0)::numeric AS novo_total_compras_rede
  FROM public.profiles p
  LEFT JOIN compras_indicados ci ON ci.indicador_id = p.id
)
UPDATE public.profiles p
SET
  total_compras_rede = b.novo_total_compras_rede,
  pro_total =
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    COALESCE(p.total_compras_proprias, 0) +
    b.novo_total_compras_rede
FROM base b
WHERE p.id = b.id;

-- Marca pedidos pagos com indicador como pro_rede_aplicado
UPDATE public.orders o
SET pro_rede_aplicado = TRUE
WHERE LOWER(COALESCE(o.status, '')) IN ('paid', 'separacao', 'despachado', 'entregue')
  AND COALESCE(o.excluir_comissao, FALSE) = FALSE
  AND o.profile_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = o.profile_id
      AND p.indicado_por IS NOT NULL
  );

COMMIT;

-- Conferência: top indicadores com pontos de rede
SELECT
  p.id,
  p.full_name,
  p.email,
  COALESCE(p.total_compras_rede, 0) AS total_compras_rede,
  COALESCE(p.pro_total, 0) AS pro_total
FROM public.profiles p
WHERE COALESCE(p.total_compras_rede, 0) > 0
ORDER BY p.total_compras_rede DESC, p.full_name ASC
LIMIT 30;
