-- ============================================================
-- Inclui a linha comercial "finalizadores" nos CHECKs já criados.
-- Rodar no SQL Editor do Supabase (os scripts antigos não alteram
-- constraint que já existe).
-- ============================================================

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_linha_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_linha_check
  CHECK (
    linha IS NULL OR linha IN (
      'daily','nutri','repair','scalp','curls','blond','align3','finalizadores'
    )
  );

COMMENT ON COLUMN public.products.linha IS
  'Linha MASC: daily, nutri, repair, scalp, curls, blond, align3, finalizadores. NULL = ainda sem classificar.';

ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_linha_interesse_check;
ALTER TABLE public.crm_leads
  ADD CONSTRAINT crm_leads_linha_interesse_check
  CHECK (
    linha_interesse IS NULL OR linha_interesse IN (
      'daily','nutri','repair','scalp','curls','blond','align3','finalizadores'
    )
  );

DO $$
DECLARE
  r RECORD;
BEGIN
  IF to_regclass('public.comercial_provas') IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'comercial_provas'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%align3%'
  LOOP
    EXECUTE format('ALTER TABLE public.comercial_provas DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;

  ALTER TABLE public.comercial_provas
    ADD CONSTRAINT comercial_provas_linha_check
    CHECK (linha IN ('daily','nutri','repair','scalp','curls','blond','align3','finalizadores'));
END $$;
