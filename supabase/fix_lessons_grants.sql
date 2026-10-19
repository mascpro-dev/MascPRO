-- Repara o player depois do ajuste de permissão das aulas.
-- O RLS ligado na hora da leitura derrubou a evolução.
-- Supabase → SQL Editor → colar → Run.

DROP POLICY IF EXISTS "lessons_admin_escreve" ON public.lessons;
DROP POLICY IF EXISTS "courses_admin_escreve" ON public.courses;
DROP POLICY IF EXISTS "lessons_leitura" ON public.lessons;
DROP POLICY IF EXISTS "courses_leitura" ON public.courses;

ALTER TABLE public.lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO postgres, service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO postgres, service_role, authenticated;
GRANT SELECT ON public.lessons TO anon;
GRANT SELECT ON public.courses TO anon;
