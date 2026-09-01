-- Indicador do lead (quem recebe comissão / PRO de rede no 1º pedido)
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS indicador_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS crm_leads_indicador_idx ON crm_leads(indicador_id);

COMMENT ON COLUMN crm_leads.indicador_id IS
  'Membro que indicou o lead; usado em profiles.indicado_por no primeiro pedido pago.';
