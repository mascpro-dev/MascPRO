-- =============================================================================
-- FIX DE CONSISTÊNCIA DE PRO (GLOBAL)
--
-- Objetivo:
-- - Corrigir perfis divergentes para a regra oficial de PRO.
--
-- Regra oficial consolidada:
--   moedas_pro_acumuladas = personal_coins + network_coins + total_compras_proprias + total_compras_rede
--
-- O que o script faz:
-- 1) Garante coluna total_compras_proprias (e store_coins legado)
-- 2) Recalcula total_compras_proprias por compras próprias (pedidos pagos)
-- 3) Recalcula total_compras_rede por compras dos indicados diretos (pedidos pagos)
-- 4) Recalcula moedas_pro_acumuladas pela regra oficial
--
-- Status válidos de pedido:
--   paid, separacao, despachado, entregue
--
-- Segurança:
-- - Script idempotente (pode executar mais de uma vez sem duplicar)
-- =============================================================================

BEGIN;
-- Evita conflito de trigger BEFORE UPDATE na profiles durante recálculo em massa.
-- O valor volta ao normal automaticamente ao fim da transação.
SET LOCAL session_replication_role = replica;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_coins numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_compras_proprias numeric NOT NULL DEFAULT 0;

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
    COALESCE(SUM(pv.valor_pro), 0)::numeric AS total_compras_proprias
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
),
base AS (
  SELECT
    p.id,
    COALESCE(cp.total_compras_proprias, 0)::numeric AS novo_total_compras_proprias,
    COALESCE(ci.total_rede, 0)::numeric AS novo_total_compras_rede
  FROM public.profiles p
  LEFT JOIN compras_proprias cp ON cp.profile_id = p.id
  LEFT JOIN compras_indicados ci ON ci.indicador_id = p.id
)
UPDATE public.profiles p
SET
  total_compras_proprias = b.novo_total_compras_proprias,
  -- Mantém coluna legada sincronizada temporariamente
  store_coins = b.novo_total_compras_proprias,
  total_compras_rede = b.novo_total_compras_rede,
  moedas_pro_acumuladas =
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    b.novo_total_compras_proprias +
    b.novo_total_compras_rede
FROM base b
WHERE p.id = b.id;

COMMIT;

-- Pós-fix: resumo rápido
SELECT
  COUNT(*) AS total_perfis,
  COUNT(*) FILTER (
    WHERE COALESCE(p.moedas_pro_acumuladas, 0) =
      (
        COALESCE(p.personal_coins, 0) +
        COALESCE(p.network_coins, 0) +
        COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) +
        COALESCE(p.total_compras_rede, 0)
      )
  ) AS perfis_ok,
  COUNT(*) FILTER (
    WHERE COALESCE(p.moedas_pro_acumuladas, 0) <>
      (
        COALESCE(p.personal_coins, 0) +
        COALESCE(p.network_coins, 0) +
        COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) +
        COALESCE(p.total_compras_rede, 0)
      )
  ) AS perfis_divergentes
FROM public.profiles p;

