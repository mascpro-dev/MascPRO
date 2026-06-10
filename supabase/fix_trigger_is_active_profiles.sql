-- =============================================================================
-- FIX URGENTE: column "is_active" of relation "profiles" does not exist
--
-- Causa: trigger/função legada (ex.: sync_coins_for_ranking) ainda referencia
-- profiles.is_active, removida em limpeza_fase1b_drop_sem_uso_adicional.sql.
-- Dispara ao confirmar pagamento (UPDATE em profiles.total_compras_*).
--
-- Rode UMA VEZ no SQL Editor do Supabase (produção).
-- =============================================================================

BEGIN;

SET LOCAL session_replication_role = replica;

-- 1) Remove triggers em profiles cujo corpo da função menciona is_active
DO $$
DECLARE
  r record;
  v_def text;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      t.tgname AS trigger_name,
      p.oid AS proc_oid
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
      AND p.prokind IN ('f', 'p')
  LOOP
    BEGIN
      v_def := pg_get_functiondef(r.proc_oid);
    EXCEPTION
      WHEN OTHERS THEN
        CONTINUE;
    END;

    IF v_def IS NULL OR v_def NOT ILIKE '%is_active%' THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I',
      r.trigger_name,
      r.schema_name,
      r.table_name
    );
    RAISE NOTICE 'Trigger removido: %.%', r.table_name, r.trigger_name;
  END LOOP;
END $$;

-- 2) Função legada conhecida
DROP FUNCTION IF EXISTS public.sync_coins_for_ranking() CASCADE;

-- 3) Remove outras funções públicas que ainda referenciam is_active
-- (pg_get_functiondef falha em agregados como array_agg — filtramos prokind)
DO $$
DECLARE
  r record;
  v_def text;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.oid AS proc_oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND p.proname <> 'profiles_sync_pro_total'
  LOOP
    BEGIN
      v_def := pg_get_functiondef(r.proc_oid);
    EXCEPTION
      WHEN OTHERS THEN
        CONTINUE;
    END;

    IF v_def IS NULL OR v_def NOT ILIKE '%is_active%' THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
    RAISE NOTICE 'Função removida: %', r.sig;
  END LOOP;
END $$;

-- 4) Garante coluna pro_total e trigger oficial (sem is_active)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_total numeric NOT NULL DEFAULT 0;

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

-- 5) Sincroniza pro_total existente
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

COMMIT;

-- Conferência: lista triggers restantes em profiles (deve estar só o oficial)
SELECT
  t.tgname AS trigger_name,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND c.relname = 'profiles'
ORDER BY t.tgname;
