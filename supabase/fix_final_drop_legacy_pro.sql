-- =============================================================================
-- FIX FINAL: consolida legados, coluna pro_total, trigger, remove colunas antigas
--
-- Ordem: rode DEPOIS de fix_consistencia_pro / validacao em staging.
-- SET LOCAL session_replication_role = replica evita erro "tuple already modified"
-- em cascatas de trigger.
--
-- Este script DROP antecipado de v_ranking_global, v_pro_totals e trg_nivel_tecnico
-- remove dependencias em moedas_pro_acumuladas; as views sao recriadas no final.
-- Se v_ranking_global na sua base tinha outras colunas, ajuste o CREATE OR REPLACE.
-- =============================================================================

BEGIN;

SET LOCAL session_replication_role = replica;

-- Views legadas que referenciam moedas_pro_acumuladas (precisam sair antes do DROP COLUMN)
DROP VIEW IF EXISTS public.v_ranking_global CASCADE;
DROP VIEW IF EXISTS public.v_pro_totals CASCADE;
DROP VIEW IF EXISTS public.v_pro_saldos CASCADE;

-- Trigger legado na coluna moedas_pro_acumuladas — recriamos a logica em profiles_sync_pro_total
DROP TRIGGER IF EXISTS trg_nivel_tecnico ON public.profiles;

-- Coluna para ordenacao no PostgREST (suma dos 4 campos oficiais)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_total numeric NOT NULL DEFAULT 0;

-- Merge defensivo (so se a coluna ainda existir)
DO $merge$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'coins'
  ) THEN
    UPDATE public.profiles
    SET personal_coins = COALESCE(personal_coins, 0) + COALESCE(coins, 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'passive_pro'
  ) THEN
    UPDATE public.profiles
    SET network_coins = COALESCE(network_coins, 0) + COALESCE(passive_pro, 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'store_coins'
  ) THEN
    -- Evita dobrar: mesmo metrica que total_compras_proprias; fica o maior
    UPDATE public.profiles
    SET total_compras_proprias = GREATEST(
      COALESCE(total_compras_proprias, 0),
      COALESCE(store_coins, 0)
    );
  END IF;
END
$merge$;

UPDATE public.profiles
SET pro_total =
  COALESCE(personal_coins, 0) +
  COALESCE(network_coins, 0) +
  COALESCE(total_compras_proprias, 0) +
  COALESCE(total_compras_rede, 0);

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

  -- Mesma escala que app/(main)/home e api/conquistas (total PRO)
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

ALTER TABLE public.profiles DROP COLUMN IF EXISTS coins;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS passive_pro;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS store_coins;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS moedas_pro_acumuladas;

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

-- Compat: nome de coluna antigo = total PRO atual (consumidores da view antiga)
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

-- =============================================================================
-- Apos subir: confira
--   SELECT * FROM v_pro_saldos ORDER BY total_pro DESC LIMIT 20;
-- =============================================================================
