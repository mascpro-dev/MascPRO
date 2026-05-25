-- ===========================================================
-- Carrinhos abandonados — para o admin recuperar vendas
-- Rode este arquivo uma única vez no SQL Editor do Supabase.
-- ===========================================================

CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  profile_id        UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  items             JSONB        NOT NULL DEFAULT '[]'::jsonb,
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_cep      TEXT,
  shipping_address  TEXT,
  shipping_cost     NUMERIC(12,2) DEFAULT 0,
  status            TEXT          NOT NULL DEFAULT 'ativo', -- ativo | convertido | descartado
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS abandoned_carts_status_idx
  ON public.abandoned_carts(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS abandoned_carts_updated_at_idx
  ON public.abandoned_carts(updated_at DESC);

-- Trigger para manter updated_at em sincronia
CREATE OR REPLACE FUNCTION public.abandoned_carts_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS abandoned_carts_touch ON public.abandoned_carts;
CREATE TRIGGER abandoned_carts_touch
  BEFORE UPDATE ON public.abandoned_carts
  FOR EACH ROW EXECUTE FUNCTION public.abandoned_carts_touch_updated_at();

-- RLS — usuário só vê o próprio carrinho; admin vê tudo
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS abandoned_carts_self_read   ON public.abandoned_carts;
DROP POLICY IF EXISTS abandoned_carts_self_write  ON public.abandoned_carts;
DROP POLICY IF EXISTS abandoned_carts_self_update ON public.abandoned_carts;
DROP POLICY IF EXISTS abandoned_carts_admin       ON public.abandoned_carts;

CREATE POLICY abandoned_carts_self_read ON public.abandoned_carts
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY abandoned_carts_self_write ON public.abandoned_carts
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY abandoned_carts_self_update ON public.abandoned_carts
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY abandoned_carts_admin ON public.abandoned_carts
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.abandoned_carts TO authenticated;
GRANT ALL ON public.abandoned_carts TO service_role;
