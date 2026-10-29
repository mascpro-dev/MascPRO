-- Dois contatos no mesmo salão (dono + cabeleireiro).
-- Não cria segundo lead. Só ADD COLUMN.
-- Rodar no SQL Editor do Supabase.

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS dono_nome TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS dono_telefone TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS cabeleireiro_nome TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS cabeleireiro_telefone TEXT;

COMMENT ON COLUMN public.crm_leads.dono_nome IS 'Decisor / dono do salão. O cadastro do salão continua único.';
COMMENT ON COLUMN public.crm_leads.cabeleireiro_nome IS 'Profissional do salão. Não gera outro lead.';
