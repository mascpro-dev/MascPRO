-- Uso comercial do produto: Home care ou Profissional.
-- Define em qual aba do painel comercial o item entra.
-- Rode no SQL Editor do Supabase.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS uso text;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_uso_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_uso_check
  CHECK (uso IS NULL OR uso IN ('home_care', 'profissional'));

COMMENT ON COLUMN public.products.uso IS
  'home_care = régua Home care; profissional = aba Profissional. Sem valor, home care ainda usa a linha (Daily, Nutri, Repair, Scalp, Curls, Blond).';

-- Pedidos com item de uso profissional
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS eh_kit_profissional boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_kit_profissional
  ON public.orders (eh_kit_profissional)
  WHERE eh_kit_profissional = true;

-- Preenche o que já existia pela linha, para não esvaziar a régua atual
UPDATE public.products
SET uso = 'home_care'
WHERE uso IS NULL
  AND linha IN ('daily', 'nutri', 'repair', 'scalp', 'curls', 'blond');

UPDATE public.products
SET uso = 'profissional'
WHERE uso IS NULL
  AND linha IN ('align3', 'finalizadores');
