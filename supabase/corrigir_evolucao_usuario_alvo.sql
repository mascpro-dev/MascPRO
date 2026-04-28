-- =============================================================================
-- CORRECAO CIRURGICA DA EVOLUCAO DE 1 USUARIO
--
-- Objetivo:
--   Forcar o TOTAL exibido na evolucao para um valor alvo (ex.: 1820),
--   sem usar colunas legadas.
--
-- Como funciona:
--   total_final = personal_coins + network_coins + total_compras_proprias + total_compras_rede
--   O script recalcula total_compras_proprias para fechar exatamente no alvo.
-- =============================================================================

BEGIN;

-- 1) PARAMETROS (edite aqui)
WITH params AS (
  SELECT
    'SEU_EMAIL_AQUI'::text AS email_alvo,
    1820::numeric AS evolucao_alvo
),
base AS (
  SELECT
    p.id,
    p.full_name,
    p.email,
    COALESCE(p.personal_coins, 0) AS personal_coins,
    COALESCE(p.network_coins, 0) AS network_coins,
    COALESCE(p.total_compras_rede, 0) AS total_compras_rede,
    prm.evolucao_alvo
  FROM public.profiles p
  JOIN params prm ON LOWER(COALESCE(p.email, '')) = LOWER(prm.email_alvo)
),
alvo AS (
  SELECT
    b.*,
    GREATEST(
      b.evolucao_alvo - (b.personal_coins + b.network_coins + b.total_compras_rede),
      0
    )::numeric AS novo_total_compras_proprias
  FROM base b
)
UPDATE public.profiles p
SET
  total_compras_proprias = a.novo_total_compras_proprias,
  pro_total =
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    a.novo_total_compras_proprias +
    COALESCE(p.total_compras_rede, 0),
  nivel_tecnico = CASE
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      a.novo_total_compras_proprias +
      COALESCE(p.total_compras_rede, 0)
    ) >= 500001 THEN 'PROFISSIONAL BLACK'
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      a.novo_total_compras_proprias +
      COALESCE(p.total_compras_rede, 0)
    ) >= 150001 THEN 'PROFISSIONAL GOLD'
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      a.novo_total_compras_proprias +
      COALESCE(p.total_compras_rede, 0)
    ) >= 50001 THEN 'PROFISSIONAL PRATA'
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      a.novo_total_compras_proprias +
      COALESCE(p.total_compras_rede, 0)
    ) >= 10001 THEN 'PROFISSIONAL BRONZE'
    ELSE 'INICIANTE'
  END
FROM alvo a
WHERE p.id = a.id;

-- 2) Conferencia final do usuario alvo
WITH params AS (
  SELECT
    'SEU_EMAIL_AQUI'::text AS email_alvo
)
SELECT
  p.id,
  p.full_name,
  p.email,
  COALESCE(p.personal_coins, 0) AS personal_coins,
  COALESCE(p.network_coins, 0) AS network_coins,
  COALESCE(p.total_compras_proprias, 0) AS total_compras_proprias,
  COALESCE(p.total_compras_rede, 0) AS total_compras_rede,
  (
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    COALESCE(p.total_compras_proprias, 0) +
    COALESCE(p.total_compras_rede, 0)
  ) AS total_evolucao_final,
  COALESCE(p.pro_total, 0) AS pro_total
FROM public.profiles p
JOIN params prm ON LOWER(COALESCE(p.email, '')) = LOWER(prm.email_alvo);

COMMIT;
