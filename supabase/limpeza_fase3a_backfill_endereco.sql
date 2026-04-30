-- =============================================================================
-- LIMPEZA FASE 3A: Backfill endereco → address
--
-- Situação atual:
--   - Coluna `address` = endereço salvo pelo formulário de cadastro (EN)
--   - Coluna `endereco` = endereço salvo pelo CartDrawer (PT) — será removida
--   - Colunas `number`, `neighborhood`, `complement`, `city`, `state` já existem
--     em inglês e são as canônicas
--   - As colunas `numero`, `bairro`, `complemento`, `cidade` (PT) nunca existiram
--     na tabela — o CartDrawer estava lendo NULL nessas posições
--
-- Este script copia `endereco` → `address` onde `address` está vazio.
-- Rode ANTES de atualizar o CartDrawer.tsx.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- DIAGNÓSTICO: quantos usuários têm dado em `endereco` mas não em `address`
-- -----------------------------------------------------------------------------
SELECT
  COUNT(*) AS total_usuarios,
  COUNT(*) FILTER (
    WHERE (endereco IS NOT NULL AND endereco <> '')
      AND (address  IS NULL     OR address  = '')
  ) AS precisam_backfill,
  COUNT(*) FILTER (
    WHERE (endereco IS NOT NULL AND endereco <> '')
      AND (address  IS NOT NULL AND address  <> '')
  ) AS ambos_preenchidos
FROM public.profiles;

-- -----------------------------------------------------------------------------
-- BACKFILL: copia endereco → address apenas onde address está vazio
-- -----------------------------------------------------------------------------
UPDATE public.profiles
SET address = NULLIF(TRIM(endereco), '')
WHERE (address IS NULL OR address = '')
  AND (endereco IS NOT NULL AND endereco <> '');

COMMIT;

-- -----------------------------------------------------------------------------
-- CONFERÊNCIA: usuários com endereco que ainda não migraram
-- (deve retornar 0 linhas após o update)
-- -----------------------------------------------------------------------------
SELECT id, full_name, address, endereco
FROM public.profiles
WHERE (endereco IS NOT NULL AND endereco <> '')
  AND (address  IS NULL     OR address  = '')
ORDER BY full_name;
