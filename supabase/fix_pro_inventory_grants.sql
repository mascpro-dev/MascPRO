-- =============================================================================
-- FIX COMPLETO: estoque PRO ao marcar pedido "entregue"
--
-- Cria tabelas que faltam + colunas + GRANTs + RLS.
-- Rode UMA VEZ no SQL Editor do Supabase (produção).
-- =============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- ── 1) Tabela principal do estoque do salão ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pro_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'outros',
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'un',
  min_quantity numeric,
  notes text,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_inventory
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pro_inventory_prof ON public.pro_inventory (professional_id);
CREATE INDEX IF NOT EXISTS idx_pro_inventory_prof_cat ON public.pro_inventory (professional_id, category);
CREATE INDEX IF NOT EXISTS idx_pro_inventory_prof_product ON public.pro_inventory (professional_id, product_id)
  WHERE product_id IS NOT NULL;

-- ── 2) Histórico de movimentações (pode não existir ainda) ───────────────────
CREATE TABLE IF NOT EXISTS public.pro_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders (id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  inventory_id uuid REFERENCES public.pro_inventory (id) ON DELETE SET NULL,
  quantity_delta numeric NOT NULL,
  reason text NOT NULL DEFAULT 'pedido_entregue',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pim_prof_created ON public.pro_inventory_movements (professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pim_order ON public.pro_inventory_movements (order_id);

-- ── 3) Flag idempotente no pedido ────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estoque_recebimento_aplicado boolean NOT NULL DEFAULT false;

-- ── 4) GRANTs (permission denied) ────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_inventory TO authenticated;
GRANT ALL ON public.pro_inventory TO service_role;

GRANT SELECT, INSERT ON public.pro_inventory_movements TO authenticated;
GRANT ALL ON public.pro_inventory_movements TO service_role;

-- ── 5) RLS + políticas do membro ─────────────────────────────────────────────
ALTER TABLE public.pro_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pro_inventory_select_own" ON public.pro_inventory;
DROP POLICY IF EXISTS "pro_inventory_insert_own" ON public.pro_inventory;
DROP POLICY IF EXISTS "pro_inventory_update_own" ON public.pro_inventory;
DROP POLICY IF EXISTS "pro_inventory_delete_own" ON public.pro_inventory;

CREATE POLICY "pro_inventory_select_own" ON public.pro_inventory
  FOR SELECT TO authenticated
  USING (auth.uid() = professional_id);

CREATE POLICY "pro_inventory_insert_own" ON public.pro_inventory
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "pro_inventory_update_own" ON public.pro_inventory
  FOR UPDATE TO authenticated
  USING (auth.uid() = professional_id)
  WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "pro_inventory_delete_own" ON public.pro_inventory
  FOR DELETE TO authenticated
  USING (auth.uid() = professional_id);

DROP POLICY IF EXISTS "pim_select_own" ON public.pro_inventory_movements;

CREATE POLICY "pim_select_own" ON public.pro_inventory_movements
  FOR SELECT TO authenticated
  USING (auth.uid() = professional_id);

-- service_role ignora RLS nas inserções do backend (pedido entregue).
