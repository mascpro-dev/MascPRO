-- =============================================================================
-- FIX: cidade/estado + pontos de rede (membros)
--
-- 1) Sincroniza city/state <-> municipio/uf (dados não se perdem entre telas)
-- 2) Recalcula total_compras_rede e pro_total para todos os indicadores
-- =============================================================================

BEGIN;

SET LOCAL session_replication_role = replica;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS municipio TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT;

-- municipio/uf -> city/state
UPDATE public.profiles p
SET
  city = COALESCE(NULLIF(TRIM(p.city), ''), NULLIF(TRIM(p.municipio), '')),
  state = COALESCE(NULLIF(TRIM(p.state), ''), NULLIF(TRIM(p.uf), ''))
WHERE (COALESCE(p.city, '') = '' AND COALESCE(p.municipio, '') <> '')
   OR (COALESCE(p.state, '') = '' AND COALESCE(p.uf, '') <> '');

-- city/state -> municipio/uf
UPDATE public.profiles p
SET
  municipio = COALESCE(NULLIF(TRIM(p.municipio), ''), NULLIF(TRIM(p.city), '')),
  uf = COALESCE(NULLIF(TRIM(p.uf), ''), NULLIF(TRIM(p.state), ''))
WHERE (COALESCE(p.municipio, '') = '' AND COALESCE(p.city, '') <> '')
   OR (COALESCE(p.uf, '') = '' AND COALESCE(p.state, '') <> '');

-- Recalcula pontos de rede (compras dos indicados diretos)
WITH pedidos_validos AS (
  SELECT
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
  JOIN public.profiles p_comprador ON p_comprador.id = pv.profile_id
  JOIN public.profiles p_indicador ON p_indicador.id = p_comprador.indicado_por
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

COMMIT;

-- Conferência: membros citados + top rede
SELECT
  p.id,
  p.full_name,
  p.email,
  COALESCE(p.city, p.municipio) AS cidade,
  COALESCE(p.state, p.uf) AS uf,
  COALESCE(p.network_coins, 0) AS network_coins,
  COALESCE(p.total_compras_rede, 0) AS total_compras_rede,
  COALESCE(p.pro_total, 0) AS pro_total
FROM public.profiles p
WHERE LOWER(COALESCE(p.full_name, '')) LIKE '%josselia%'
   OR LOWER(COALESCE(p.full_name, '')) LIKE '%leonardo batista%'
   OR LOWER(COALESCE(p.full_name, '')) LIKE '%hozania%'
ORDER BY p.full_name ASC;
