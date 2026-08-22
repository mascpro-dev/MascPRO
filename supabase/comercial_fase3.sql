-- ============================================================
-- Painel comercial — Fase 3: recorrência
-- Kit home care + régua 7/15/30. Recompra 30/45/60 é lida dos pedidos.
-- Nunca trata pedido antigo como kit (default false).
-- Só ADD COLUMN + tabela nova. Pedidos e membros ficam intactos.
-- Rodar no SQL Editor do Supabase.
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS eh_kit_home_care BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS motivo_nao_recompra TEXT;

COMMENT ON COLUMN public.orders.eh_kit_home_care IS
  'Marca manual. Pedido comum NÃO é kit. Default false.';
COMMENT ON COLUMN public.orders.motivo_nao_recompra IS
  'so_usou, nao_gostou, preco, esqueceu, comprou_outro, sem_resposta, outro';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_motivo_nao_recompra_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_motivo_nao_recompra_check
      CHECK (
        motivo_nao_recompra IS NULL OR motivo_nao_recompra IN (
          'so_usou','nao_gostou','preco','esqueceu','comprou_outro','sem_resposta','outro'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_kit_home_care_idx
  ON public.orders(eh_kit_home_care)
  WHERE eh_kit_home_care = true;

CREATE TABLE IF NOT EXISTS public.comercial_regua (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  order_id      UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  profile_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  etapa         TEXT        NOT NULL
    CHECK (etapa IN ('d7','d15','d30')),
  previsto_em   DATE        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','feito','atrasado','pulado')),
  feito_em      TIMESTAMPTZ,
  feito_por     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  notas         TEXT,
  UNIQUE (order_id, etapa)
);

COMMENT ON TABLE public.comercial_regua IS
  'Follow-up pós-venda do kit: dia 7, 15 e 30. Recompra 30/45/60 não mora aqui.';

CREATE INDEX IF NOT EXISTS comercial_regua_previsto_idx
  ON public.comercial_regua(previsto_em, status);
CREATE INDEX IF NOT EXISTS comercial_regua_order_idx
  ON public.comercial_regua(order_id);
CREATE INDEX IF NOT EXISTS comercial_regua_profile_idx
  ON public.comercial_regua(profile_id);

CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comercial_regua_updated_at ON public.comercial_regua;
CREATE TRIGGER comercial_regua_updated_at
  BEFORE UPDATE ON public.comercial_regua
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

ALTER TABLE public.comercial_regua ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comercial_regua_admin_all ON public.comercial_regua;
CREATE POLICY comercial_regua_admin_all ON public.comercial_regua
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_regua TO authenticated;
GRANT ALL ON public.comercial_regua TO service_role;
