-- =============================================================================
-- LIMPEZA FASE 3B: DROP da coluna `endereco`
--
-- Pré-requisitos OBRIGATÓRIOS:
--   [x] Fase 3A rodada (backfill endereco → address)
--   [x] CartDrawer.tsx atualizado para usar address/number/complement/neighborhood/city/state
--   [x] Testado no app: salvar e carregar endereço no carrinho funciona
--
-- Coluna `cep` é mantida — é única (CEP brasileiro) e já está no nome certo.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- VERIFICAÇÃO: garante que nenhum dado ficou para trás
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  pendentes integer;
  col_existe boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'endereco'
  ) INTO col_existe;

  IF NOT col_existe THEN
    RAISE NOTICE 'Coluna endereco já não existe — nada a fazer.';
    RETURN;
  END IF;

  EXECUTE '
    SELECT COUNT(*) FROM public.profiles
    WHERE (endereco IS NOT NULL AND endereco <> '''')
      AND (address  IS NULL     OR address  = '''')
  ' INTO pendentes;

  IF pendentes > 0 THEN
    RAISE EXCEPTION
      'ABORTADO: % usuário(s) ainda têm dados em endereco não migrados para address. '
      'Rode a Fase 3A novamente.',
      pendentes;
  END IF;

  RAISE NOTICE 'Verificação OK. Removendo coluna endereco...';
END $$;

-- -----------------------------------------------------------------------------
-- DROP
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS endereco;

COMMIT;

-- -----------------------------------------------------------------------------
-- CONFERÊNCIA FINAL
-- -----------------------------------------------------------------------------
SELECT
  ordinal_position AS pos,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
ORDER BY ordinal_position;
