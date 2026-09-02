-- =============================================================================
-- PRO por indicação direta: 50 network_coins por cada indicado
--
-- Regra: cada perfil com indicado_por credita +50 no network_coins do indicador.
-- Ao mudar indicado_por: -50 no antigo, +50 no novo.
--
-- Rode UMA VEZ no Supabase. Depois confira com a query de validação no final.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_network_coins_indicacao()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE
  v_bonus numeric := 50;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.indicado_por IS NOT NULL THEN
    UPDATE public.profiles
    SET network_coins = COALESCE(network_coins, 0) + v_bonus,
        updated_at = NOW()
    WHERE id = NEW.indicado_por;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.indicado_por IS DISTINCT FROM NEW.indicado_por
  THEN
    IF OLD.indicado_por IS NOT NULL THEN
      UPDATE public.profiles
      SET network_coins = GREATEST(0, COALESCE(network_coins, 0) - v_bonus),
          updated_at = NOW()
      WHERE id = OLD.indicado_por;
    END IF;

    IF NEW.indicado_por IS NOT NULL THEN
      UPDATE public.profiles
      SET network_coins = COALESCE(network_coins, 0) + v_bonus,
          updated_at = NOW()
      WHERE id = NEW.indicado_por;
    END IF;
  END IF;

  RETURN NEW;
END;
$f$;

DROP TRIGGER IF EXISTS trg_sync_network_coins_indicacao ON public.profiles;

CREATE TRIGGER trg_sync_network_coins_indicacao
  AFTER INSERT OR UPDATE OF indicado_por
  ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_network_coins_indicacao();

-- Backfill: network_coins = indicados diretos × 50
WITH contagem AS (
  SELECT
    indicado_por AS indicador_id,
    (COUNT(*)::numeric * 50) AS coins_esperado
  FROM public.profiles
  WHERE indicado_por IS NOT NULL
  GROUP BY indicado_por
)
UPDATE public.profiles p
SET
  network_coins = c.coins_esperado,
  pro_total =
    COALESCE(p.personal_coins, 0) +
    c.coins_esperado +
    COALESCE(p.total_compras_proprias, 0) +
    COALESCE(p.total_compras_rede, 0),
  updated_at = NOW()
FROM contagem c
WHERE p.id = c.indicador_id;

-- Zera network_coins de quem não tem mais indicados (dados órfãos)
UPDATE public.profiles p
SET
  network_coins = 0,
  pro_total =
    COALESCE(p.personal_coins, 0) +
    COALESCE(p.total_compras_proprias, 0) +
    COALESCE(p.total_compras_rede, 0),
  updated_at = NOW()
WHERE COALESCE(p.network_coins, 0) <> 0
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles i WHERE i.indicado_por = p.id
  );

COMMIT;

-- Conferência: líderes com indicações × 50 PRO
SELECT
  p.full_name,
  COUNT(i.id) AS indicados,
  COALESCE(p.network_coins, 0) AS network_coins,
  COUNT(i.id) * 50 AS esperado,
  CASE
    WHEN COALESCE(p.network_coins, 0) = COUNT(i.id) * 50 THEN 'OK'
    ELSE 'DIVERGENTE'
  END AS status
FROM public.profiles p
JOIN public.profiles i ON i.indicado_por = p.id
GROUP BY p.id, p.full_name, p.network_coins
ORDER BY indicados DESC, p.full_name;
