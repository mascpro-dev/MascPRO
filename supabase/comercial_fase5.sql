-- ============================================================
-- Painel comercial — Fase 5: prova e evento
-- Banco de provas + resultado comercial do evento.
-- events continua sendo o calendário (flyer, data, cidade).
-- community_posts só sugere; não vira prova sozinho.
-- crm_leads.evento_id é opcional e nulo. CRM antigo não muda.
-- Rodar no SQL Editor do Supabase.
-- ============================================================

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS crm_leads_evento_idx
  ON public.crm_leads(evento_id)
  WHERE evento_id IS NOT NULL;

COMMENT ON COLUMN public.crm_leads.evento_id IS
  'Vínculo opcional. Lead antigo fica nulo. Origem evento continua no campo origem.';

CREATE TABLE IF NOT EXISTS public.comercial_provas (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  realizado_em       DATE        NOT NULL,
  cliente_nome       TEXT        NOT NULL,
  cidade             TEXT        NOT NULL,
  estado             TEXT,
  linha              TEXT        NOT NULL
    CHECK (linha IN ('daily','nutri','repair','scalp','curls','blond','align3')),
  protocolo          TEXT        NOT NULL,
  autorizacao        BOOLEAN     NOT NULL DEFAULT false,
  uso_comercial      BOOLEAN     NOT NULL DEFAULT false,
  midia_url          TEXT,
  community_post_id  UUID        REFERENCES public.community_posts(id) ON DELETE SET NULL,
  profile_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_id           UUID        REFERENCES public.events(id) ON DELETE SET NULL,
  crm_lead_id        UUID        REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  notas              TEXT,
  created_by         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (community_post_id)
);

COMMENT ON TABLE public.comercial_provas IS
  'Banco comercial. Exige linha, cidade, protocolo e autorização. Post da comunidade não entra sozinho.';

CREATE INDEX IF NOT EXISTS comercial_provas_realizado_idx
  ON public.comercial_provas(realizado_em DESC);
CREATE INDEX IF NOT EXISTS comercial_provas_linha_idx
  ON public.comercial_provas(linha);
CREATE INDEX IF NOT EXISTS comercial_provas_profile_idx
  ON public.comercial_provas(profile_id);
CREATE INDEX IF NOT EXISTS comercial_provas_event_idx
  ON public.comercial_provas(event_id);

CREATE TABLE IF NOT EXISTS public.comercial_evento_resultado (
  id             UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW(),
  event_id       UUID          NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  leads_gerados  INTEGER       NOT NULL DEFAULT 0 CHECK (leads_gerados >= 0),
  pedidos        INTEGER       NOT NULL DEFAULT 0 CHECK (pedidos >= 0),
  receita        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (receita >= 0),
  custo          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (custo >= 0),
  followup_ok    BOOLEAN       NOT NULL DEFAULT false,
  followup_em    DATE,
  notas          TEXT,
  updated_by     UUID          REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.comercial_evento_resultado IS
  'Resultado comercial do evento. events não é alterado. Sem follow-up depois da data = vazamento.';

CREATE INDEX IF NOT EXISTS comercial_evento_resultado_followup_idx
  ON public.comercial_evento_resultado(followup_ok);

CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comercial_provas_updated_at ON public.comercial_provas;
CREATE TRIGGER comercial_provas_updated_at
  BEFORE UPDATE ON public.comercial_provas
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS comercial_evento_resultado_updated_at ON public.comercial_evento_resultado;
CREATE TRIGGER comercial_evento_resultado_updated_at
  BEFORE UPDATE ON public.comercial_evento_resultado
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

ALTER TABLE public.comercial_provas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_evento_resultado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comercial_provas_admin_all ON public.comercial_provas;
CREATE POLICY comercial_provas_admin_all ON public.comercial_provas
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

DROP POLICY IF EXISTS comercial_evento_resultado_admin_all ON public.comercial_evento_resultado;
CREATE POLICY comercial_evento_resultado_admin_all ON public.comercial_evento_resultado
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_provas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_evento_resultado TO authenticated;
GRANT ALL ON public.comercial_provas TO service_role;
GRANT ALL ON public.comercial_evento_resultado TO service_role;
