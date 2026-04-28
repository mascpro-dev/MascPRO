-- =============================================================================
-- RESET GLOBAL PRO (BASE OFICIAL, SEM LEGADO)
--
-- Objetivo:
-- 1) Recalcular para TODOS os perfis os campos oficiais derivados de pedidos:
--    - total_compras_proprias
--    - total_compras_rede
-- 2) Recalcular pro_total e nivel_tecnico pela regra oficial:
--    pro_total = personal_coins + network_coins + total_compras_proprias + total_compras_rede
-- 3) Remover dependencias/colunas legadas:
--    - coins, passive_pro, store_coins, moedas_pro_acumuladas
-- 4) Recriar views de compatibilidade apontando para pro_total.
--
-- IMPORTANTE:
-- - Script idempotente.
-- - Nao soma legado.
-- - Executar em janela de manutencao (altera toda a tabela profiles).
-- =============================================================================

BEGIN;

SET LOCAL session_replication_role = replica;

-- 0) Garantir colunas oficiais
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personal_coins numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS network_coins numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_compras_proprias numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_compras_rede numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_total numeric NOT NULL DEFAULT 0;

-- 1) Derrubar views antigas antes de remover colunas legadas
DROP VIEW IF EXISTS public.v_ranking_global CASCADE;
DROP VIEW IF EXISTS public.v_pro_totals CASCADE;
DROP VIEW IF EXISTS public.v_pro_saldos CASCADE;

-- 2) Remover trigger/funcoes legadas que tentem escrever em colunas removidas
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
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
      AND p.proname IN ('sync_coins_for_ranking', 'profiles_sync_pro_total')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', r.trigger_name, r.schema_name, r.table_name);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.sync_coins_for_ranking();
DROP FUNCTION IF EXISTS public.profiles_sync_pro_total();

-- 3) Recalculo GLOBAL idempotente a partir de orders (sem legado)
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
    COALESCE(SUM(pv.valor_pro), 0)::numeric AS novo_total_compras_proprias
  FROM pedidos_validos pv
  GROUP BY pv.profile_id
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
    COALESCE(cp.novo_total_compras_proprias, 0)::numeric AS novo_total_compras_proprias,
    COALESCE(ci.novo_total_compras_rede, 0)::numeric AS novo_total_compras_rede
  FROM public.profiles p
  LEFT JOIN compras_proprias cp ON cp.profile_id = p.id
  LEFT JOIN compras_indicados ci ON ci.indicador_id = p.id
)
UPDATE public.profiles p
SET
  total_compras_proprias = b.novo_total_compras_proprias,
  total_compras_rede = b.novo_total_compras_rede,
  pro_total =
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    b.novo_total_compras_proprias +
    b.novo_total_compras_rede,
  nivel_tecnico = CASE
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      b.novo_total_compras_proprias +
      b.novo_total_compras_rede
    ) >= 500001 THEN 'PROFISSIONAL BLACK'
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      b.novo_total_compras_proprias +
      b.novo_total_compras_rede
    ) >= 150001 THEN 'PROFISSIONAL GOLD'
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      b.novo_total_compras_proprias +
      b.novo_total_compras_rede
    ) >= 50001 THEN 'PROFISSIONAL PRATA'
    WHEN (
      COALESCE(p.personal_coins, 0) +
      COALESCE(p.network_coins, 0) +
      b.novo_total_compras_proprias +
      b.novo_total_compras_rede
    ) >= 10001 THEN 'PROFISSIONAL BRONZE'
    ELSE 'INICIANTE'
  END
FROM base b
WHERE p.id = b.id;

-- 4) Trigger oficial (somente colunas oficiais)
CREATE OR REPLACE FUNCTION public.profiles_sync_pro_total()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  NEW.pro_total :=
    COALESCE(NEW.personal_coins, 0) +
    COALESCE(NEW.network_coins, 0) +
    COALESCE(NEW.total_compras_proprias, 0) +
    COALESCE(NEW.total_compras_rede, 0);

  NEW.nivel_tecnico := CASE
    WHEN NEW.pro_total >= 500001 THEN 'PROFISSIONAL BLACK'
    WHEN NEW.pro_total >= 150001 THEN 'PROFISSIONAL GOLD'
    WHEN NEW.pro_total >= 50001 THEN 'PROFISSIONAL PRATA'
    WHEN NEW.pro_total >= 10001 THEN 'PROFISSIONAL BRONZE'
    ELSE 'INICIANTE'
  END;

  RETURN NEW;
END;
$f$;

DROP TRIGGER IF EXISTS trg_profiles_pro_total ON public.profiles;
CREATE TRIGGER trg_profiles_pro_total
  BEFORE INSERT OR UPDATE OF
    personal_coins, network_coins, total_compras_proprias, total_compras_rede
  ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.profiles_sync_pro_total();

-- 5) Remover colunas legadas definitivamente
ALTER TABLE public.profiles DROP COLUMN IF EXISTS coins;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS passive_pro;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS store_coins;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS moedas_pro_acumuladas;

-- 6) Views oficiais + compatibilidade
CREATE OR REPLACE VIEW public.v_pro_saldos AS
SELECT
  p.id,
  p.full_name,
  COALESCE(p.personal_coins, 0) AS personal_coins,
  COALESCE(p.network_coins, 0) AS network_coins,
  COALESCE(p.total_compras_proprias, 0) AS total_compras_proprias,
  COALESCE(p.total_compras_rede, 0) AS total_compras_rede,
  COALESCE(p.pro_total, 0) AS total_pro
FROM public.profiles p;

CREATE OR REPLACE VIEW public.v_pro_totals AS
SELECT
  p.id,
  p.full_name,
  COALESCE(p.personal_coins, 0) AS personal_coins,
  COALESCE(p.network_coins, 0) AS network_coins,
  COALESCE(p.total_compras_proprias, 0) AS total_compras_proprias,
  COALESCE(p.total_compras_rede, 0) AS total_compras_rede,
  COALESCE(p.pro_total, 0) AS moedas_pro_acumuladas
FROM public.profiles p;

CREATE OR REPLACE VIEW public.v_ranking_global AS
SELECT
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(p.pro_total, 0) DESC, p.full_name ASC NULLS LAST
  ) AS posicao,
  p.id,
  p.full_name,
  COALESCE(p.pro_total, 0) AS moedas_pro_acumuladas
FROM public.profiles p;

COMMIT;

-- 7) Auditoria final (deve dar 0 divergentes)
SELECT
  COUNT(*) AS total_perfis,
  COUNT(*) FILTER (
    WHERE COALESCE(p.pro_total, 0) <>
      (
        COALESCE(p.personal_coins, 0) +
        COALESCE(p.network_coins, 0) +
        COALESCE(p.total_compras_proprias, 0) +
        COALESCE(p.total_compras_rede, 0)
      )
  ) AS perfis_divergentes
FROM public.profiles p;
