-- =============================================================================
-- Corrige "permission denied for table products" no painel admin
-- Execute no: Supabase → SQL Editor → colar tudo → Run
-- =============================================================================
-- Causa típica: (1) RLS só com SELECT, sem política p/ admin;
-- (2) falta de GRANT na tabela em projeto legado;
-- (3) coluna role com texto diferente de 'ADMIN' (agora usamos UPPER/TRIM).
-- =============================================================================

-- 1) Privilégios base na tabela (legados às vezes faltam GRANT no Postgres)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO postgres, service_role, authenticated;
GRANT SELECT ON public.products TO anon;

-- 2) Remove políticas de admin com nomes anteriores
DROP POLICY IF EXISTS "Admin insere produtos" ON public.products;
DROP POLICY IF EXISTS "Admin atualiza produtos" ON public.products;
DROP POLICY IF EXISTS "Admin exclui produtos" ON public.products;
DROP POLICY IF EXISTS "admin_produtos_mutation" ON public.products;

-- 3) RLS: admin (profiles.role) pode inserir/atualizar/excluir
--    Autenticado cujo UPPER(TRIM(role)) = 'ADMIN'

CREATE POLICY "Admin insere produtos" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND UPPER(TRIM(COALESCE(p.role::text, ''))) = 'ADMIN'
    )
  );

CREATE POLICY "Admin atualiza produtos" ON public.products
  FOR UPDATE TO authenticated
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

CREATE POLICY "Admin exclui produtos" ON public.products
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND UPPER(TRIM(COALESCE(p.role::text, ''))) = 'ADMIN'
    )
  );

-- 4) Garante a policy de leitura pública (recria se tiver apagada em algum ajuste legado)
DROP POLICY IF EXISTS "Ver Produtos" ON public.products;
CREATE POLICY "Ver Produtos" ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5) Confirma RLS (ajuste nada; só mantém tabela com RLS ativo, como o seed)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
