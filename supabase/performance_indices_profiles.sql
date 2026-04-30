-- =============================================================================
-- PERFORMANCE: Índices na tabela profiles
--
-- IMPORTANTE: O Supabase SQL Editor envolve tudo em transação automaticamente,
-- o que impede o CONCURRENTLY. Por isso usamos CREATE INDEX sem CONCURRENTLY.
-- O IF NOT EXISTS garante que é seguro rodar mais de uma vez.
--
-- Se quiser criar sem travar em produção: rode via psql ou Supabase CLI
-- com cada comando separado.
-- =============================================================================

-- 1) indicado_por — mais crítico: JOINs de rede, comissão, webhook, orders
CREATE INDEX IF NOT EXISTS idx_profiles_indicado_por
  ON public.profiles (indicado_por);

-- 2) role — filtros de admin, sidebar, RLS, push notifications
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);

-- 3) pro_total DESC — ORDER BY do ranking e comunidade
CREATE INDEX IF NOT EXISTS idx_profiles_pro_total_desc
  ON public.profiles (pro_total DESC);

-- 4) nivel_tecnico — jornada e scripts de recálculo
CREATE INDEX IF NOT EXISTS idx_profiles_nivel_tecnico
  ON public.profiles (nivel_tecnico);

-- 5) email case-insensitive — lookup por email sem varredura total
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON public.profiles (LOWER(email));

-- 6) onboarding_completed — índice parcial (só false), cobre check do layout
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding
  ON public.profiles (onboarding_completed)
  WHERE onboarding_completed = false;

-- 7) booking_slug — lookup de agenda por slug
CREATE INDEX IF NOT EXISTS idx_profiles_booking_slug
  ON public.profiles (booking_slug)
  WHERE booking_slug IS NOT NULL;

-- 8) role + pro_total — ranking filtrado por papel
CREATE INDEX IF NOT EXISTS idx_profiles_role_pro_total
  ON public.profiles (role, pro_total DESC);

-- -----------------------------------------------------------------------------
-- CONFERÊNCIA: lista todos os índices ativos em profiles
-- -----------------------------------------------------------------------------
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename  = 'profiles'
ORDER BY indexname;
