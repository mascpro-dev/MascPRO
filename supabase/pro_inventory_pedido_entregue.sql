-- Complemento: estoque automático ao marcar pedido como entregue + vínculo com produto da loja.
-- Rode no SQL Editor se você JÁ criou pro_inventory com o script antigo (sem product_id).
-- Se for instalação nova, use só pro_inventory.sql (já inclui product_id).

ALTER TABLE pro_inventory
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pro_inventory_prof_product ON pro_inventory (professional_id, product_id)
  WHERE product_id IS NOT NULL;

-- Evita somar duas vezes os mesmos itens se confirmar recebimento for chamado de novo por engano
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS estoque_recebimento_aplicado boolean NOT NULL DEFAULT false;
