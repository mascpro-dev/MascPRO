-- Permite que o perfil com role = 'ADMIN' faça INSERT/UPDATE/DELETE em public.products
-- (necessário quando a rota de API usa o JWT do usuário em vez de service_role)
-- SELECT público continua com a policy "Ver Produtos" (seed_products / equivalente)

DROP POLICY IF EXISTS "Admin insere produtos" ON public.products;
DROP POLICY IF EXISTS "Admin atualiza produtos" ON public.products;
DROP POLICY IF EXISTS "Admin exclui produtos" ON public.products;

CREATE POLICY "Admin insere produtos" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1) = 'ADMIN'
  );

CREATE POLICY "Admin atualiza produtos" ON public.products
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1) = 'ADMIN'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1) = 'ADMIN'
  );

CREATE POLICY "Admin exclui produtos" ON public.products
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1) = 'ADMIN'
  );
