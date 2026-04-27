-- =============================================================================
-- MODELO ENXUTO DE PRO (MIGRAÇÃO DE CONSOLIDAÇÃO)
--
-- Colunas oficiais após consolidação:
-- - personal_coins
-- - network_coins
-- - total_compras_proprias
-- - total_compras_rede
--
-- Total exibido no app:
-- total_pro = personal_coins + network_coins + total_compras_proprias + total_compras_rede
--
-- Colunas legadas (mantidas temporariamente para compatibilidade):
-- - store_coins, moedas_pro_acumuladas, passive_pro, coins
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personal_coins numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS network_coins numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_compras_proprias numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_compras_rede numeric NOT NULL DEFAULT 0;

-- Migra legados para coluna oficial de compras próprias
UPDATE public.profiles
SET total_compras_proprias = COALESCE(total_compras_proprias, 0) + COALESCE(store_coins, 0)
WHERE COALESCE(store_coins, 0) > 0
  AND COALESCE(total_compras_proprias, 0) = 0;

-- Mantém legados sincronizados por enquanto (não quebrar telas antigas)
UPDATE public.profiles
SET
  store_coins = COALESCE(total_compras_proprias, 0),
  moedas_pro_acumuladas =
    COALESCE(personal_coins, 0) +
    COALESCE(network_coins, 0) +
    COALESCE(total_compras_proprias, 0) +
    COALESCE(total_compras_rede, 0);

COMMIT;

-- VIEW única de leitura para relatórios/painéis
CREATE OR REPLACE VIEW public.v_pro_saldos AS
SELECT
  p.id,
  p.full_name,
  COALESCE(p.personal_coins, 0) AS personal_coins,
  COALESCE(p.network_coins, 0) AS network_coins,
  COALESCE(p.total_compras_proprias, 0) AS total_compras_proprias,
  COALESCE(p.total_compras_rede, 0) AS total_compras_rede,
  (
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.network_coins, 0) +
    COALESCE(p.total_compras_proprias, 0) +
    COALESCE(p.total_compras_rede, 0)
  ) AS total_pro
FROM public.profiles p;

-- ---------------------------------------------------------------------------
-- Depois de validar consistência, rode no Supabase (ordem do projeto):
--   supabase/fix_final_drop_legacy_pro.sql
-- (adiciona pro_total + trigger, remove legados, recria v_pro_saldos)
-- ---------------------------------------------------------------------------

