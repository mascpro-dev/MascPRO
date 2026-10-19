-- Corrige "permission denied for table lessons" ao salvar aula no admin.
-- Supabase → SQL Editor → colar → Run.

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO postgres, service_role;
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated;

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lessons_leitura" ON public.lessons;
CREATE POLICY "lessons_leitura" ON public.lessons
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "courses_leitura" ON public.courses;
CREATE POLICY "courses_leitura" ON public.courses
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "lessons_admin_escreve" ON public.lessons;
CREATE POLICY "lessons_admin_escreve" ON public.lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND UPPER(TRIM(COALESCE(p.role::text, ''))) = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND UPPER(TRIM(COALESCE(p.role::text, ''))) = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "courses_admin_escreve" ON public.courses;
CREATE POLICY "courses_admin_escreve" ON public.courses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND UPPER(TRIM(COALESCE(p.role::text, ''))) = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND UPPER(TRIM(COALESCE(p.role::text, ''))) = 'ADMIN'
    )
  );
