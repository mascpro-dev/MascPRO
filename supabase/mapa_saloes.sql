-- ============================================================
-- Mapa de salões: visibilidade pública + coordenadas
-- Rode UMA VEZ no SQL Editor do Supabase.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mapa_visivel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mapa_lat double precision,
  ADD COLUMN IF NOT EXISTS mapa_lng double precision,
  ADD COLUMN IF NOT EXISTS mapa_pin text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_mapa_pin_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_mapa_pin_check
  CHECK (
    mapa_pin IS NULL
    OR mapa_pin IN ('parceiro', 'agendamento', 'certificado', 'embaixador', 'educador', 'destaque')
  );

CREATE INDEX IF NOT EXISTS idx_profiles_mapa_visivel
  ON public.profiles (mapa_visivel)
  WHERE mapa_visivel = true;
