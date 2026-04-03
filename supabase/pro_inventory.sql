-- Estoque do salão (cabeleireiro/barbeiro): produtos e materiais de uso no espaço.
-- Rode no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS pro_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'outros',
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'un',
  min_quantity numeric,
  notes text,
  product_id uuid REFERENCES products (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_inventory_prof ON pro_inventory (professional_id);
CREATE INDEX IF NOT EXISTS idx_pro_inventory_prof_cat ON pro_inventory (professional_id, category);

ALTER TABLE pro_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_inventory_select_own" ON pro_inventory FOR SELECT
  USING (auth.uid() = professional_id);

CREATE POLICY "pro_inventory_insert_own" ON pro_inventory FOR INSERT
  WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "pro_inventory_update_own" ON pro_inventory FOR UPDATE
  USING (auth.uid() = professional_id);

CREATE POLICY "pro_inventory_delete_own" ON pro_inventory FOR DELETE
  USING (auth.uid() = professional_id);

-- Idempotência: não creditar estoque duas vezes para o mesmo pedido
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS estoque_recebimento_aplicado boolean NOT NULL DEFAULT false;
