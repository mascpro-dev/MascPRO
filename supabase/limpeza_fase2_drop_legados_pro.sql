-- =============================================================================
-- LIMPEZA FASE 2: DROP de colunas legadas PRO
--
-- Colunas: coins, store_coins, passive_pro, moedas_pro_acumuladas
--
-- PODE RODAR DIRETO — o script verifica dependências automaticamente
-- e aborta com mensagem clara se encontrar alguma.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- VERIFICAÇÃO AUTOMÁTICA: aborta se ainda existir trigger, função ou view
-- que dependa dessas colunas
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_triggers  integer;
  v_funcoes   integer;
  v_views     integer;
BEGIN
  -- Triggers ativos
  SELECT COUNT(*) INTO v_triggers
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND (
      action_statement ILIKE '%store_coins%'
      OR action_statement ILIKE '%passive_pro%'
      OR action_statement ILIKE '%moedas_pro_acumuladas%'
    );

  -- Funções ativas
  SELECT COUNT(*) INTO v_funcoes
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND (
      routine_definition ILIKE '%store_coins%'
      OR routine_definition ILIKE '%passive_pro%'
      OR routine_definition ILIKE '%moedas_pro_acumuladas%'
    );

  -- Views ativas
  SELECT COUNT(*) INTO v_views
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND (
      view_definition ILIKE '%store_coins%'
      OR view_definition ILIKE '%passive_pro%'
      OR view_definition ILIKE '%moedas_pro_acumuladas%'
    );

  IF v_triggers > 0 OR v_funcoes > 0 OR v_views > 0 THEN
    RAISE EXCEPTION
      'ABORTADO: ainda existem dependências ativas (triggers: %, funções: %, views: %). '
      'Me manda o print do erro para eu resolver antes do DROP.',
      v_triggers, v_funcoes, v_views;
  END IF;

  RAISE NOTICE 'Verificação OK — nenhuma dependência ativa encontrada. Prosseguindo com DROP...';
END $$;

-- -----------------------------------------------------------------------------
-- DROP das colunas legadas (IF NOT EXISTS = não dá erro se já foram removidas)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS coins,
  DROP COLUMN IF EXISTS store_coins,
  DROP COLUMN IF EXISTS passive_pro,
  DROP COLUMN IF EXISTS moedas_pro_acumuladas;

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
