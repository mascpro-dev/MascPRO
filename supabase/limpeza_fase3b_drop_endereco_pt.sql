-- =============================================================================
-- LIMPEZA FASE 3B: DROP das colunas de endereço em português
--
-- Pré-requisitos OBRIGATÓRIOS antes de rodar:
--   [x] Fase 3A (backfill PT→EN) executada com sucesso
--   [x] CartDrawer.tsx atualizado para gravar em: city, state, number,
--       neighborhood, complement (colunas EN)
--   [x] Testado no app: fluxo de compra grava e lê corretamente
--
-- Colunas que serão removidas:
--   cidade, estado, numero, bairro, complemento, logradouro
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASSO 1: verificação de segurança — não deve existir nenhum dado
--          em PT que não está em EN (resultado deve ser 0 linhas)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  pendentes integer;
BEGIN
  SELECT COUNT(*) INTO pendentes
  FROM public.profiles
  WHERE
    (cidade IS NOT NULL AND cidade <> '' AND (city IS NULL OR city = ''))
    OR (estado IS NOT NULL AND estado <> '' AND (state IS NULL OR state = ''))
    OR (bairro IS NOT NULL AND bairro <> '' AND (neighborhood IS NULL OR neighborhood = ''));

  IF pendentes > 0 THEN
    RAISE EXCEPTION
      'ABORTADO: % usuário(s) ainda têm dados em PT não migrados para EN. '
      'Rode a Fase 3A primeiro e confira a conferência final.',
      pendentes;
  END IF;

  RAISE NOTICE 'Verificação OK: nenhum dado PT não migrado. Prosseguindo com DROP...';
END $$;

-- -----------------------------------------------------------------------------
-- PASSO 2: DROP das colunas PT
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS cidade,
  DROP COLUMN IF EXISTS estado,
  DROP COLUMN IF EXISTS numero,
  DROP COLUMN IF EXISTS bairro,
  DROP COLUMN IF EXISTS complemento,
  DROP COLUMN IF EXISTS logradouro;

COMMIT;

-- -----------------------------------------------------------------------------
-- CONFERÊNCIA FINAL
-- -----------------------------------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
ORDER BY ordinal_position;
