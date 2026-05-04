-- ============================================================
-- CRM → ERP: Jornada 360° do Cliente
-- Vincula leads convertidos a perfis do MascPRO
-- ============================================================

-- Adiciona vínculo com o perfil do sistema quando o lead converte
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS profile_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS convertido_em TIMESTAMPTZ;

-- Índice para busca rápida de leads vinculados a um perfil
CREATE INDEX IF NOT EXISTS crm_leads_profile_id_idx ON crm_leads(profile_id);
