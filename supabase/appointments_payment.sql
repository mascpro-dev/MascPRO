-- Pagamento: receita no financeiro so quando paid = true.
-- Formas: credito, debito, pix, carteira (pagar depois). Usar payment_due_date na carteira.
-- paid_at = dia em que o dinheiro entrou.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS payment_due_date date;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS paid_at date;

UPDATE appointments
SET
  paid = true,
  paid_at = (appointment_date::date)
WHERE lower(coalesce(status, '')) = 'concluido'
  AND paid = false
  AND paid_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_prof_paid_at ON appointments (professional_id, paid_at)
  WHERE paid = true;

CREATE INDEX IF NOT EXISTS idx_appointments_prof_carteira_pendente ON appointments (professional_id)
  WHERE paid = false AND payment_method = 'carteira' AND lower(coalesce(status, '')) = 'concluido';
