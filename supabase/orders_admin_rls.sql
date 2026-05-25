-- ===========================================================
-- Garante que o ADMIN consegue ler/atualizar TODOS os pedidos
-- e itens da loja. Rode uma vez no SQL Editor do Supabase.
-- ===========================================================

ALTER TABLE public.orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items   ENABLE ROW LEVEL SECURITY;

-- ── Orders ─────────────────────────────────────────────────
DROP POLICY IF EXISTS orders_self_select   ON public.orders;
DROP POLICY IF EXISTS orders_self_insert   ON public.orders;
DROP POLICY IF EXISTS orders_admin_all     ON public.orders;

-- Cliente: vê / cria só os próprios
CREATE POLICY orders_self_select ON public.orders
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY orders_self_insert ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Admin: tudo
CREATE POLICY orders_admin_all ON public.orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND UPPER(TRIM(p.role)) = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND UPPER(TRIM(p.role)) = 'ADMIN'
    )
  );

-- ── Order items ────────────────────────────────────────────
DROP POLICY IF EXISTS order_items_self_select ON public.order_items;
DROP POLICY IF EXISTS order_items_self_insert ON public.order_items;
DROP POLICY IF EXISTS order_items_admin_all   ON public.order_items;

CREATE POLICY order_items_self_select ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.profile_id = auth.uid()
    )
  );

CREATE POLICY order_items_self_insert ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.profile_id = auth.uid()
    )
  );

CREATE POLICY order_items_admin_all ON public.order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND UPPER(TRIM(p.role)) = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND UPPER(TRIM(p.role)) = 'ADMIN'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.orders      TO service_role;
GRANT ALL ON public.order_items TO service_role;
