-- Link curto de agendamento: /agendar/[booking_slug]
-- Execute no SQL Editor do Supabase (ou migração).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_slug text;

COMMENT ON COLUMN public.profiles.booking_slug IS 'Slug único para URL pública /agendar/{slug}; minúsculas, a-z 0-9 e hífen.';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_booking_slug_key
  ON public.profiles (booking_slug)
  WHERE booking_slug IS NOT NULL AND btrim(booking_slug) <> '';
