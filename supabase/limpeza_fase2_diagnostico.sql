-- =============================================================================
-- DIAGNÓSTICO FASE 2: identificar função e views com dependência nas colunas
-- legadas (store_coins, passive_pro, moedas_pro_acumuladas)
-- =============================================================================

-- 1) Qual função ainda referencia essas colunas?
SELECT
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_definition ILIKE '%store_coins%'
    OR routine_definition ILIKE '%passive_pro%'
    OR routine_definition ILIKE '%moedas_pro_acumuladas%'
  )
ORDER BY routine_name;

-- 2) Quais views ainda referenciam essas colunas?
SELECT
  table_name  AS view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    view_definition ILIKE '%store_coins%'
    OR view_definition ILIKE '%passive_pro%'
    OR view_definition ILIKE '%moedas_pro_acumuladas%'
  )
ORDER BY table_name;
