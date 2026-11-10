-- Detalhe das formas quando o pedido usa mais de um pagamento.
-- O texto em orders.payment_method já guarda o resumo (ex.: pix 200.00 + cartao 350.00).
-- Rodar no SQL Editor do Supabase.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pagamentos JSONB;

NOTIFY pgrst, 'reload schema';
