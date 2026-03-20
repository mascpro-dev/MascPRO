-- Executar no Supabase → SQL Editor (apaga TODOS os pedidos e vínculos comuns).
-- Ajuste o nome das tabelas se o seu schema for diferente.

BEGIN;

DELETE FROM commissions WHERE order_id IS NOT NULL;
DELETE FROM order_items;
DELETE FROM orders;

COMMIT;
