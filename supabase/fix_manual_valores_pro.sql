-- =============================================================================
-- AJUSTE MANUAL DE VALORES PRO (DIRETO E CONFIAVEL)
--
-- Ajusta EXATAMENTE estas colunas:
--   - personal_coins
--   - network_coins
--   - total_compras_proprias
--   - total_compras_rede
--
-- E recalcula:
--   - pro_total = soma das 4 colunas acima
--
-- Nao usa coluna legada.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- MODO 1: AJUSTE POR UUID
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE tmp_fix_pro_uuid (
  user_id uuid,
  personal_coins numeric,
  network_coins numeric,
  total_compras_proprias numeric,
  total_compras_rede numeric
);

-- PREENCHA AQUI (apague os exemplos e coloque os reais)
-- INSERT INTO tmp_fix_pro_uuid (user_id, personal_coins, network_coins, total_compras_proprias, total_compras_rede)
-- VALUES
-- ('00000000-0000-0000-0000-000000000001', 100, 200, 1200, 320),
-- ('00000000-0000-0000-0000-000000000002', 50, 80, 900, 150);

UPDATE public.profiles p
SET
  personal_coins = f.personal_coins,
  network_coins = f.network_coins,
  total_compras_proprias = f.total_compras_proprias,
  total_compras_rede = f.total_compras_rede,
  pro_total =
    COALESCE(f.personal_coins, 0) +
    COALESCE(f.network_coins, 0) +
    COALESCE(f.total_compras_proprias, 0) +
    COALESCE(f.total_compras_rede, 0)
FROM tmp_fix_pro_uuid f
WHERE p.id = f.user_id;

-- -----------------------------------------------------------------------------
-- MODO 2: AJUSTE POR EMAIL
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE tmp_fix_pro_email (
  email text,
  personal_coins numeric,
  network_coins numeric,
  total_compras_proprias numeric,
  total_compras_rede numeric
);

-- PREENCHA AQUI (apague os exemplos e coloque os reais)
-- INSERT INTO tmp_fix_pro_email (email, personal_coins, network_coins, total_compras_proprias, total_compras_rede)
-- VALUES
-- ('usuario1@email.com', 100, 200, 1200, 320),
-- ('usuario2@email.com', 50, 80, 900, 150);

UPDATE public.profiles p
SET
  personal_coins = f.personal_coins,
  network_coins = f.network_coins,
  total_compras_proprias = f.total_compras_proprias,
  total_compras_rede = f.total_compras_rede,
  pro_total =
    COALESCE(f.personal_coins, 0) +
    COALESCE(f.network_coins, 0) +
    COALESCE(f.total_compras_proprias, 0) +
    COALESCE(f.total_compras_rede, 0)
FROM tmp_fix_pro_email f
WHERE LOWER(COALESCE(p.email, '')) = LOWER(COALESCE(f.email, ''));

COMMIT;

-- -----------------------------------------------------------------------------
-- CONFERENCIA: veja os perfis ajustados nesta execucao
-- -----------------------------------------------------------------------------
SELECT
  p.id,
  p.full_name,
  p.email,
  p.personal_coins,
  p.network_coins,
  p.total_compras_proprias,
  p.total_compras_rede,
  p.pro_total
FROM public.profiles p
WHERE p.id IN (SELECT user_id FROM tmp_fix_pro_uuid)
   OR LOWER(COALESCE(p.email, '')) IN (
        SELECT LOWER(COALESCE(email, '')) FROM tmp_fix_pro_email
      )
ORDER BY p.full_name ASC;
