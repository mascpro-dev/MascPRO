-- Configuracao de lembrete automatico WhatsApp (por profissional)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_template text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS studio_address text;

COMMENT ON COLUMN public.profiles.reminder_enabled IS 'Liga/desliga lembrete automatico de agendamentos no dia.';
COMMENT ON COLUMN public.profiles.reminder_template IS 'Template customizado da mensagem. Suporta placeholders {{client_name}}, etc.';
COMMENT ON COLUMN public.profiles.studio_address IS 'Endereco usado no lembrete automatico.';

-- Log de envio para evitar duplicidade no mesmo dia/agendamento
CREATE TABLE IF NOT EXISTS public.appointment_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments (id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  send_date date NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointment_reminder_logs_once_day
  ON public.appointment_reminder_logs (appointment_id, send_date, channel);

CREATE INDEX IF NOT EXISTS idx_appointment_reminder_logs_pro_date
  ON public.appointment_reminder_logs (professional_id, send_date);
