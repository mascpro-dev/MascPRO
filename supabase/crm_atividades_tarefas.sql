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

COMMENT ON COLUMN public.crm_leads.atividade_tipo IS 'Próxima atividade: ligacao, disponibilidade, outro, visita, recebimento.';
COMMENT ON COLUMN public.crm_leads.atividade_em IS 'Prazo da próxima atividade. Pinta o card (azul/cinza/amarelo/vermelho).';
