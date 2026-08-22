-- ============================================================
-- Painel comercial — Fase 4: rede
-- Score 0–100 de embaixadora e distribuidor.
-- NÃO escreve em profiles.nivel_embaixador nem em pro_total.
-- Só tabela nova. Membros, níveis e ranking PRO ficam intactos.
-- Rodar no SQL Editor do Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.comercial_score (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  profile_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  periodo              TEXT        NOT NULL,
  papel                TEXT        NOT NULL
    CHECK (papel IN ('embaixadora','distribuidor')),
  prova                SMALLINT    CHECK (prova IS NULL OR (prova >= 0 AND prova <= 20)),
  conteudo             SMALLINT    CHECK (conteudo IS NULL OR (conteudo >= 0 AND conteudo <= 20)),
  treino               SMALLINT    CHECK (treino IS NULL OR (treino >= 0 AND treino <= 10)),
  postura              SMALLINT    CHECK (postura IS NULL OR (postura >= 0 AND postura <= 10)),
  saloes_prospectados  INTEGER     NOT NULL DEFAULT 0
    CHECK (saloes_prospectados >= 0),
  saloes_ativados      INTEGER     NOT NULL DEFAULT 0
    CHECK (saloes_ativados >= 0),
  relatorio_ok         BOOLEAN     NOT NULL DEFAULT false,
  politica_ok          BOOLEAN     NOT NULL DEFAULT false,
  exclusividade        SMALLINT    CHECK (exclusividade IS NULL OR (exclusividade >= 0 AND exclusividade <= 15)),
  notas                TEXT,
  updated_by           UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (profile_id, periodo)
);

COMMENT ON TABLE public.comercial_score IS
  'Notas manuais do ciclo comercial. Venda e home care são lidos dos pedidos. Nunca grava nivel_embaixador.';

CREATE INDEX IF NOT EXISTS comercial_score_periodo_idx
  ON public.comercial_score(periodo, papel);
CREATE INDEX IF NOT EXISTS comercial_score_profile_idx
  ON public.comercial_score(profile_id);

CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comercial_score_updated_at ON public.comercial_score;
CREATE TRIGGER comercial_score_updated_at
  BEFORE UPDATE ON public.comercial_score
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

ALTER TABLE public.comercial_score ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comercial_score_admin_all ON public.comercial_score;
CREATE POLICY comercial_score_admin_all ON public.comercial_score
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_score TO authenticated;
GRANT ALL ON public.comercial_score TO service_role;
