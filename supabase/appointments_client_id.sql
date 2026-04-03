-- Vincula agendamentos ao cadastro profissional (pro_clients).
-- Rode no SQL Editor do Supabase após existir a tabela pro_clients.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES pro_clients (id) ON DELETE SET NULL;

COMMENT ON COLUMN appointments.client_id IS 'Cliente do cadastro PRO; nome/telefone no agendamento espelham o cadastro ao salvar com ID.';

CREATE INDEX IF NOT EXISTS idx_appointments_prof_client_id
  ON appointments (professional_id, client_id)
  WHERE client_id IS NOT NULL;

-- Opcional: tentar amarrar registros antigos (executar uma vez; revisar duplicatas antes).
-- UPDATE appointments a
-- SET client_id = c.id
-- FROM pro_clients c
-- WHERE a.professional_id = c.professional_id
--   AND a.client_id IS NULL
--   AND lower(trim(a.client_name)) = lower(trim(c.name))
--   AND (
--     a.client_phone IS NULL OR c.phone IS NULL
--     OR regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g') = regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')
--   );
