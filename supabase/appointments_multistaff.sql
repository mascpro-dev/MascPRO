-- Vínculo opcional do agendamento a um membro da equipe + tipo (serviço vs bloqueio pessoal).

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.pro_staff (id) ON DELETE SET NULL;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS appointment_kind text NOT NULL DEFAULT 'servico';

COMMENT ON COLUMN public.appointments.staff_id IS 'Membro da equipe (pro_staff); NULL = dono da conta / responsável.';
COMMENT ON COLUMN public.appointments.appointment_kind IS 'servico | bloqueio_pessoal — bloqueio impede agendamento público naquele horário para esse profissional.';

CREATE INDEX IF NOT EXISTS idx_appointments_prof_staff_date
  ON public.appointments (professional_id, staff_id, appointment_date);
