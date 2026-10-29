-- Atividades agendadas no pipeline (ligação, disponibilidade, visita, recebimento).
-- Só ADD COLUMN. Não apaga histórico.
-- Rodar no SQL Editor do Supabase.

ALTER TABLE public.crm_atividades ADD COLUMN IF NOT EXISTS tipo_tarefa TEXT;
ALTER TABLE public.crm_atividades ADD COLUMN IF NOT EXISTS agendada_em TIMESTAMPTZ;
ALTER TABLE public.crm_atividades ADD COLUMN IF NOT EXISTS concluida_em TIMESTAMPTZ;
ALTER TABLE public.crm_atividades ADD COLUMN IF NOT EXISTS notificacao TEXT DEFAULT 'na_hora';

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS atividade_tipo TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS atividade_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS crm_atividades_agenda_idx
  ON public.crm_atividades (lead_id, agendada_em)
  WHERE agendada_em IS NOT NULL AND concluida_em IS NULL;

ALTER TABLE public.crm_atividades ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE public.crm_atividades ADD COLUMN IF NOT EXISTS cancelada_em TIMESTAMPTZ;
ALTER TABLE public.crm_atividades ADD COLUMN IF NOT EXISTS resultado TEXT;
ALTER TABLE public.crm_atividades ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS crm_atividades_responsavel_idx
  ON public.crm_atividades (responsavel_id, agendada_em);

COMMENT ON COLUMN public.crm_leads.atividade_tipo IS 'Próxima atividade do pipeline.';
COMMENT ON COLUMN public.crm_leads.atividade_em IS 'Prazo da próxima atividade. Pinta o card (azul/cinza/amarelo/vermelho).';
COMMENT ON COLUMN public.crm_atividades.titulo IS 'Título curto da atividade na central.';
COMMENT ON COLUMN public.crm_atividades.resultado IS 'Resultado registrado ao concluir. Não muda a etapa do funil.';
