-- =============================================================================
-- CORRECAO SEGURA DE PRO_TOTAL (SEM COLUNAS LEGADAS)
-- Regra oficial:
--   pro_total = personal_coins + network_coins + total_compras_proprias + total_compras_rede
-- =============================================================================

BEGIN;

-- 0) Limpeza de legado: remove triggers/funcoes que referenciam colunas removidas (ex.: coins)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace pn ON pn.oid = p.pronamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
      AND p.proname = 'sync_coins_for_ranking'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I',
      r.trigger_name,
      r.schema_name,
      r.table_name
    );
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.sync_coins_for_ranking();

-- 1) Snapshot de auditoria antes da correcao
CREATE TEMP TABLE tmp_pro_auditoria_antes AS
SELECT
  p.id,
  p.full_name,
  COALESCE(p.pro_total, 0) AS pro_total_atual,
  (
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    COALESCE(p.total_compras_proprias, 0) +
    COALESCE(p.total_compras_rede, 0)
  ) AS pro_total_esperado
FROM public.profiles p;

-- 2) Recalcula pro_total sem usar nenhuma coluna legada
UPDATE public.profiles p
SET pro_total =
  COALESCE(p.personal_coins, 0) +
  COALESCE(p.network_coins, 0) +
  COALESCE(p.total_compras_proprias, 0) +
  COALESCE(p.total_compras_rede, 0)
WHERE COALESCE(p.pro_total, 0) <> (
  COALESCE(p.personal_coins, 0) +
  COALESCE(p.network_coins, 0) +
  COALESCE(p.total_compras_proprias, 0) +
  COALESCE(p.total_compras_rede, 0)
);

-- 3) Recalcula nivel_tecnico com base no novo pro_total
UPDATE public.profiles p
SET nivel_tecnico = CASE
  WHEN COALESCE(p.pro_total, 0) >= 500001 THEN 'PROFISSIONAL BLACK'
  WHEN COALESCE(p.pro_total, 0) >= 150001 THEN 'PROFISSIONAL GOLD'
  WHEN COALESCE(p.pro_total, 0) >= 50001 THEN 'PROFISSIONAL PRATA'
  WHEN COALESCE(p.pro_total, 0) >= 10001 THEN 'PROFISSIONAL BRONZE'
  ELSE 'INICIANTE'
END
WHERE COALESCE(p.nivel_tecnico, '') <> CASE
  WHEN COALESCE(p.pro_total, 0) >= 500001 THEN 'PROFISSIONAL BLACK'
  WHEN COALESCE(p.pro_total, 0) >= 150001 THEN 'PROFISSIONAL GOLD'
  WHEN COALESCE(p.pro_total, 0) >= 50001 THEN 'PROFISSIONAL PRATA'
  WHEN COALESCE(p.pro_total, 0) >= 10001 THEN 'PROFISSIONAL BRONZE'
  ELSE 'INICIANTE'
END;

-- 4) Resultado da correcao (auditoria pos)
SELECT
  COUNT(*) AS total_perfis,
  COUNT(*) FILTER (WHERE a.pro_total_atual <> a.pro_total_esperado) AS divergentes_antes,
  COUNT(*) FILTER (
    WHERE COALESCE(p.pro_total, 0) <> (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      COALESCE(p.total_compras_proprias, 0) +
      COALESCE(p.total_compras_rede, 0)
    )
  ) AS divergentes_depois
FROM public.profiles p
JOIN tmp_pro_auditoria_antes a ON a.id = p.id;

COMMIT;

-- =============================================================================
-- Pos-execucao (opcional):
--   SELECT * FROM public.v_pro_saldos ORDER BY total_pro DESC LIMIT 20;
-- =============================================================================
