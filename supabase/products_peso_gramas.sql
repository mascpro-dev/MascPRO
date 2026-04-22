-- Peso (gramas) por produto para cálculo de frete via Correios (PAC)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS peso_gramas integer;

COMMENT ON COLUMN public.products.peso_gramas IS 'Peso do produto em gramas (envio + embalagem ainda soma CORREIOS_PESO_EMBALAGEM_G no app).';

-- Opcional: preenche com padrão razoável para itens existentes
UPDATE public.products
SET peso_gramas = 500
WHERE peso_gramas IS NULL;
