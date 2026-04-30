-- =============================================================================
-- TRIGGER: sync_nivel_embaixador
--
-- Atualiza automaticamente a coluna `nivel_embaixador` do INDICADOR sempre
-- que alguém é inserido ou muda de indicado_por em profiles.
--
-- Escala exatamente igual ao frontend (jornada/page.tsx → AMBASSADOR_LEVELS):
--   >  0 indicados → EMBAIXADOR CERTIFIED
--   > 15 indicados → EMBAIXADOR EXPERT
--   > 50 indicados → EMBAIXADOR MASTER
--   >150 indicados → EMBAIXADOR EDUCADOR
--
-- Também executa BACKFILL de todos os indicadores existentes.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) FUNÇÃO DO TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_nivel_embaixador()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE
  v_count integer;
  v_nivel text;
BEGIN

  -- Atualiza o indicador do NOVO indicado_por
  IF NEW.indicado_por IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.profiles
    WHERE indicado_por = NEW.indicado_por;

    v_nivel := CASE
      WHEN v_count > 150 THEN 'EMBAIXADOR EDUCADOR'
      WHEN v_count > 50  THEN 'EMBAIXADOR MASTER'
      WHEN v_count > 15  THEN 'EMBAIXADOR EXPERT'
      ELSE                    'EMBAIXADOR CERTIFIED'
    END;

    UPDATE public.profiles
    SET nivel_embaixador = v_nivel
    WHERE id = NEW.indicado_por;
  END IF;

  -- Se o indicado_por mudou, recalcula também o ANTIGO indicador
  IF TG_OP = 'UPDATE'
    AND OLD.indicado_por IS NOT NULL
    AND OLD.indicado_por IS DISTINCT FROM NEW.indicado_por
  THEN
    SELECT COUNT(*) INTO v_count
    FROM public.profiles
    WHERE indicado_por = OLD.indicado_por;

    v_nivel := CASE
      WHEN v_count > 150 THEN 'EMBAIXADOR EDUCADOR'
      WHEN v_count > 50  THEN 'EMBAIXADOR MASTER'
      WHEN v_count > 15  THEN 'EMBAIXADOR EXPERT'
      ELSE                    'EMBAIXADOR CERTIFIED'
    END;

    UPDATE public.profiles
    SET nivel_embaixador = v_nivel
    WHERE id = OLD.indicado_por;
  END IF;

  RETURN NEW;
END;
$f$;

-- -----------------------------------------------------------------------------
-- 2) TRIGGER NA TABELA (dispara após INSERT ou mudança de indicado_por)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sync_nivel_embaixador ON public.profiles;

CREATE TRIGGER trg_sync_nivel_embaixador
  AFTER INSERT OR UPDATE OF indicado_por
  ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_nivel_embaixador();

-- -----------------------------------------------------------------------------
-- 3) BACKFILL: corrige todos os indicadores já existentes no banco
-- -----------------------------------------------------------------------------
UPDATE public.profiles p
SET nivel_embaixador = sub.nivel
FROM (
  SELECT
    indicado_por AS referrer_id,
    COUNT(*)     AS qtd,
    CASE
      WHEN COUNT(*) > 150 THEN 'EMBAIXADOR EDUCADOR'
      WHEN COUNT(*) > 50  THEN 'EMBAIXADOR MASTER'
      WHEN COUNT(*) > 15  THEN 'EMBAIXADOR EXPERT'
      ELSE                     'EMBAIXADOR CERTIFIED'
    END AS nivel
  FROM public.profiles
  WHERE indicado_por IS NOT NULL
  GROUP BY indicado_por
) sub
WHERE p.id = sub.referrer_id;

COMMIT;

-- -----------------------------------------------------------------------------
-- CONFERÊNCIA: top indicadores com seu nível atualizado
-- -----------------------------------------------------------------------------
SELECT
  p.full_name,
  p.nivel_embaixador,
  COUNT(i.id) AS total_indicados
FROM public.profiles p
LEFT JOIN public.profiles i ON i.indicado_por = p.id
WHERE p.indicado_por IS NOT NULL OR EXISTS (
  SELECT 1 FROM public.profiles WHERE indicado_por = p.id
)
GROUP BY p.id, p.full_name, p.nivel_embaixador
ORDER BY total_indicados DESC
LIMIT 20;
