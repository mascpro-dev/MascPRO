-- Discador API4COM: token por usuário, fora de profiles (não vaza no select *).
-- Rodar no SQL Editor. Não cola o token neste arquivo do Git.

CREATE TABLE IF NOT EXISTS public.api4com_contas (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  ramal TEXT,
  api4com_nome TEXT,
  api4com_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api4com_contas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api4com_contas FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.api4com_contas TO service_role;

-- Vincular o Kevin (cole o token no lugar de COLE_O_TOKEN):
-- INSERT INTO public.api4com_contas (profile_id, token, ramal, api4com_nome, api4com_email)
-- SELECT id, 'COLE_O_TOKEN', '1000', 'Kevin Barreto de Souza', 'kevinbarretodefreitas@gmail.com'
-- FROM public.profiles
-- WHERE full_name ILIKE '%kevin%barreto%'
--    OR email ILIKE '%kevinbarreto%'
-- LIMIT 1
-- ON CONFLICT (profile_id) DO UPDATE SET
--   token = EXCLUDED.token,
--   ramal = EXCLUDED.ramal,
--   api4com_nome = EXCLUDED.api4com_nome,
--   api4com_email = EXCLUDED.api4com_email,
--   updated_at = now();
