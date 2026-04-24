-- Corrige legados de nivel para não criar/usar "tabela de preço educador_tecnico".
-- Regra oficial: EDUCADOR_TECNICO usa tabela de preço de EMBAIXADOR.

-- 1) Normaliza niveis no profile para embaixador
UPDATE public.profiles
SET nivel = 'embaixador'
WHERE lower(coalesce(nivel, '')) IN (
  'educador_tecnico',
  'educador tecnico',
  'educador_técnico',
  'educador técnico',
  'educardor_tecnico',
  'educardor tecnico',
  'educardor_técnico',
  'educardor técnico'
);

-- 2) Remove colunas legadas de preço (se existirem)
ALTER TABLE public.products DROP COLUMN IF EXISTS price_educador_tecnico;
ALTER TABLE public.products DROP COLUMN IF EXISTS price_educardor_tecnico;
