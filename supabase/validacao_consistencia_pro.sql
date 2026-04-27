-- =============================================================================
-- VALIDAÇÃO DE CONSISTÊNCIA DE PRO
-- Execute no Supabase SQL Editor para auditar se os números estão coesos.
-- =============================================================================

-- 1) VALIDAÇÃO DE 1 USUÁRIO (troque o nome se quiser)
--    Compara campos armazenados x total calculado pela regra oficial.
SELECT
  p.id,
  p.full_name,
  COALESCE(p.personal_coins, 0)       AS personal_coins,
  COALESCE(p.network_coins, 0)        AS network_coins,
  COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) AS total_compras_proprias,
  COALESCE(p.total_compras_rede, 0)   AS total_compras_rede,
  (
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) +
    COALESCE(p.total_compras_rede, 0)
  ) AS total_regra_oficial,
  COALESCE(p.moedas_pro_acumuladas, 0) AS moedas_pro_acumuladas,
  (
    COALESCE(p.moedas_pro_acumuladas, 0) -
    (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) +
      COALESCE(p.total_compras_rede, 0)
    )
  ) AS diferenca
FROM public.profiles p
WHERE LOWER(COALESCE(p.full_name, '')) LIKE '%marcelo conselheiros%';

-- 2) VALIDAÇÃO GERAL: QUEM ESTÁ DIVERGENTE DA REGRA OFICIAL
--    Retorna apenas perfis com diferença diferente de zero.
SELECT
  p.id,
  p.full_name,
  COALESCE(p.moedas_pro_acumuladas, 0) AS moedas_pro_acumuladas,
  (
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) +
    COALESCE(p.total_compras_rede, 0)
  ) AS total_regra_oficial,
  (
    COALESCE(p.moedas_pro_acumuladas, 0) -
    (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) +
      COALESCE(p.total_compras_rede, 0)
    )
  ) AS diferenca
FROM public.profiles p
WHERE (
  COALESCE(p.moedas_pro_acumuladas, 0) <>
  (
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) +
    COALESCE(p.total_compras_rede, 0)
  )
)
ORDER BY ABS(
  COALESCE(p.moedas_pro_acumuladas, 0) -
  (
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) +
    COALESCE(p.total_compras_rede, 0)
  )
) DESC, p.full_name ASC;

-- 3) RESUMO GLOBAL DA SAÚDE DOS DADOS
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

-- 4) CHECAGEM DA REGRA "COMPROU NA LOJA => GANHA total_compras_proprias"
--    Mostra compradores com pedidos pagos cujo total_compras_proprias está abaixo do esperado.
WITH compras_proprias AS (
  SELECT
    o.profile_id,
    COALESCE(SUM(ROUND(COALESCE(o.total, 0))), 0) AS esperado_total_compras_proprias
  FROM public.orders o
  WHERE o.profile_id IS NOT NULL
    AND LOWER(COALESCE(o.status, '')) IN ('paid', 'separacao', 'despachado', 'entregue')
  GROUP BY o.profile_id
)
SELECT
  p.id,
  p.full_name,
  COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) AS total_compras_proprias_atual,
  COALESCE(c.esperado_total_compras_proprias, 0) AS total_compras_proprias_esperado,
  COALESCE(c.esperado_total_compras_proprias, 0) - COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) AS faltante
FROM public.profiles p
JOIN compras_proprias c ON c.profile_id = p.id
WHERE COALESCE(p.total_compras_proprias, COALESCE(p.store_coins, 0), 0) < COALESCE(c.esperado_total_compras_proprias, 0)
ORDER BY faltante DESC, p.full_name ASC;

