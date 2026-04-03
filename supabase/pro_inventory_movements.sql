-- Histórico: de qual pedido entrou cada quantidade no estoque do salão (Gestão PRO).
-- Rode no SQL Editor do Supabase após pro_inventory / pro_inventory_pedido_entregue.

CREATE TABLE IF NOT EXISTS pro_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders (id) ON DELETE SET NULL,
  product_id uuid REFERENCES products (id) ON DELETE SET NULL,
  inventory_id uuid REFERENCES pro_inventory (id) ON DELETE SET NULL,
  quantity_delta numeric NOT NULL,
  reason text NOT NULL DEFAULT 'pedido_entregue',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pim_prof_created ON pro_inventory_movements (professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pim_order ON pro_inventory_movements (order_id);

ALTER TABLE pro_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pim_select_own" ON pro_inventory_movements FOR SELECT
  USING (auth.uid() = professional_id);

-- Inserções feitas pelo backend com service role (sem policy de INSERT para o app do membro).
