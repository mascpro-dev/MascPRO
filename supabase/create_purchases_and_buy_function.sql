-- TABELA DE COMPRAS (Para rastrear produtos comprados pelos usuários)
CREATE TABLE IF NOT EXISTS public.purchases (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    purchased_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, product_id) -- Evita compras duplicadas
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON public.purchases(product_id);

-- Habilitar RLS na tabela purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver suas próprias compras
DROP POLICY IF EXISTS "Ver próprias compras" ON public.purchases;
CREATE POLICY "Ver próprias compras" ON public.purchases 
    FOR SELECT USING (auth.uid() = user_id);

-- Política: Usuários só podem inserir suas próprias compras (via RPC)
DROP POLICY IF EXISTS "Inserir próprias compras" ON public.purchases;
CREATE POLICY "Inserir próprias compras" ON public.purchases 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- FUNÇÃO RPC: buy_product
-- Esta função é segura e faz todas as validações necessárias
CREATE OR REPLACE FUNCTION public.buy_product(
    p_product_id uuid,
    p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que a função acesse dados do usuário
AS $$
DECLARE
    v_product_price numeric;
    v_user_coins numeric;
    v_user_personal_coins numeric;
    v_total_coins numeric;
    v_already_owned boolean;
    v_result json;
BEGIN
    -- 1. Verificar se o produto existe e está ativo
    SELECT price INTO v_product_price
    FROM public.products
    WHERE id = p_product_id AND active = true;
    
    IF v_product_price IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Produto não encontrado ou inativo'
        );
    END IF;
    
    -- 2. Verificar se o usuário já possui o produto
    SELECT EXISTS(
        SELECT 1 FROM public.purchases
        WHERE user_id = p_user_id AND product_id = p_product_id
    ) INTO v_already_owned;
    
    IF v_already_owned THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Você já possui este produto'
        );
    END IF;
    
    -- 3. Buscar saldo do usuário (coins + personal_coins)
    SELECT COALESCE(coins, 0), COALESCE(personal_coins, 0)
    INTO v_user_coins, v_user_personal_coins
    FROM public.profiles
    WHERE id = p_user_id;
    
    v_total_coins := COALESCE(v_user_coins, 0) + COALESCE(v_user_personal_coins, 0);
    
    -- 4. Verificar se tem saldo suficiente
    IF v_total_coins < v_product_price THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Saldo insuficiente'
        );
    END IF;
    
    -- 5. Deduzir o preço do saldo (prioriza personal_coins, depois coins)
    IF v_user_personal_coins >= v_product_price THEN
        -- Deduz tudo de personal_coins
        UPDATE public.profiles
        SET personal_coins = personal_coins - v_product_price
        WHERE id = p_user_id;
    ELSIF v_total_coins >= v_product_price THEN
        -- Deduz de personal_coins (tudo que tem) e o resto de coins
        UPDATE public.profiles
        SET 
            personal_coins = 0,
            coins = coins - (v_product_price - v_user_personal_coins)
        WHERE id = p_user_id;
    END IF;
    
    -- 6. Registrar a compra
    INSERT INTO public.purchases (user_id, product_id)
    VALUES (p_user_id, p_product_id);
    
    -- 7. Retornar sucesso
    RETURN json_build_object(
        'success', true,
        'message', 'Compra realizada com sucesso!'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Erro ao processar compra: ' || SQLERRM
        );
END;
$$;

-- Garantir que a função seja executável por usuários autenticados
GRANT EXECUTE ON FUNCTION public.buy_product(uuid, uuid) TO authenticated;
