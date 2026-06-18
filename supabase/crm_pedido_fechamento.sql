-- ============================================================
-- CRM Pipeline → Pedido ao fechar lead
-- Gestão: empresa vs distribuidor
-- Rodar no SQL Editor do Supabase
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS gestor_tipo TEXT NOT NULL DEFAULT 'empresa'
    CHECK (gestor_tipo IN ('empresa', 'distribuidor')),
  ADD COLUMN IF NOT EXISTS distribuidor_gestor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crm_lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL;

ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_gestor_idx ON orders(gestor_tipo, distribuidor_gestor_id);
CREATE INDEX IF NOT EXISTS orders_crm_lead_idx ON orders(crm_lead_id);
CREATE INDEX IF NOT EXISTS crm_leads_order_id_idx ON crm_leads(order_id);
