-- Valor unitário no estoque do membro (contagem / último pedido).
-- Rode no SQL Editor do Supabase se a coluna ainda não existir.

ALTER TABLE public.pro_inventory
  ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(12,2) DEFAULT 0;

GRANT SELECT, INSERT ON public.pro_inventory_movements TO authenticated;

DROP POLICY IF EXISTS "pim_insert_own" ON public.pro_inventory_movements;
CREATE POLICY "pim_insert_own" ON public.pro_inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = professional_id);
