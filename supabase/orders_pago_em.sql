-- =============================================================================
-- Ativo no mês = pedido PAGO neste mês (não a data em que o carrinho foi aberto)
-- Rode no SQL Editor do Supabase.
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.pago_em IS
  'Momento em que o pedido entrou em paid/separacao/despachado/entregue. Quem está Ativo usa esta data.';

UPDATE public.orders
SET pago_em = COALESCE(pago_em, created_at)
WHERE status IN ('paid', 'separacao', 'despachado', 'entregue')
  AND pago_em IS NULL;

CREATE OR REPLACE FUNCTION public.orders_set_pago_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('paid', 'separacao', 'despachado', 'entregue') AND NEW.pago_em IS NULL THEN
    NEW.pago_em := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_set_pago_em ON public.orders;
CREATE TRIGGER orders_set_pago_em
  BEFORE INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_set_pago_em();
