-- Baixa idempotente do estoque global (products.stock) por pedido.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estoque_baixa_aplicada boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_estoque_baixa_aplicada
  ON public.orders (estoque_baixa_aplicada);

