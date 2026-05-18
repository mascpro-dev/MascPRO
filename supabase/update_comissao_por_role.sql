-- Atualiza percentuais oficiais (embaixador 15%, cabeleireiro 5%).
-- Distribuidor não recebe comissão em R$ (regra no app, não nesta tabela).

INSERT INTO public.system_config (chave, valor, descricao)
VALUES
  ('percentual_comissao', '15', 'Comissão embaixador sobre compras do indicado direto (%)'),
  ('percentual_comissao_cabeleireiro', '5', 'Comissão cabeleireiro sobre compras do indicado direto (%)')
ON CONFLICT (chave) DO UPDATE SET
  valor = EXCLUDED.valor,
  descricao = EXCLUDED.descricao;
