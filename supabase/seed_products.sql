-- 1. TABELA DE PRODUTOS (Se não existir, cria. Se existir, mantém)
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    price numeric NOT NULL, -- Aceita centavos
    image_url text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. GARANTIR A COLUNA DE PREÇO CORRETA
-- Se a tabela já existia como 'int' (moedas), isso converte para aceitar dinheiro (numeric)
DO $$
BEGIN
    ALTER TABLE public.products ALTER COLUMN price TYPE numeric;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. CORRIGIR O ERRO DA POLÍTICA (O Pulo do Gato 🐱)
-- Primeiro removemos a política antiga (se existir) para não dar erro
DROP POLICY IF EXISTS "Ver Produtos" ON public.products;

-- Agora ativamos a segurança e criamos a política limpa
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver Produtos" ON public.products FOR SELECT USING (true);

-- 4. INSERIR PRODUTOS (Apenas se a tabela estiver vazia, para não duplicar)
INSERT INTO public.products (title, description, price, image_url)
SELECT 'Mentoria Individual', '1 hora de call para alinhar estratégias.', 150.00, 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=800'
WHERE NOT EXISTS (SELECT 1 FROM public.products);

INSERT INTO public.products (title, description, price, image_url)
SELECT 'Camiseta MASC PRO', 'Camiseta exclusiva da comunidade.', 89.90, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800'
WHERE NOT EXISTS (SELECT 1 FROM public.products);

INSERT INTO public.products (title, description, price, image_url)
SELECT 'Acesso Grupo VIP', 'Networking com grandes players.', 97.00, 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=800'
WHERE NOT EXISTS (SELECT 1 FROM public.products);
