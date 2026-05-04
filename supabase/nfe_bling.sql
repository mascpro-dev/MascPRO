-- ============================================================
-- NF-e via Bling API v3
-- ============================================================

-- Produto: ID correspondente no Bling (para vincular ao emitir NF-e)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS bling_produto_id TEXT;

-- Perfil: CPF/CNPJ e endereço de entrega (obrigatórios para NF-e)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cpf_cnpj   TEXT,
  ADD COLUMN IF NOT EXISTS cep        TEXT,
  ADD COLUMN IF NOT EXISTS logradouro TEXT,
  ADD COLUMN IF NOT EXISTS numero     TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro     TEXT,
  ADD COLUMN IF NOT EXISTS municipio  TEXT,
  ADD COLUMN IF NOT EXISTS uf         TEXT;

-- Índice para busca por CPF/CNPJ
CREATE INDEX IF NOT EXISTS profiles_cpf_cnpj_idx ON profiles(cpf_cnpj);

-- Configuração do Bling (token e preferências)
-- A tabela bling_config já foi criada em erp_completo.sql
-- Apenas garante que as colunas existam
ALTER TABLE bling_config
  ADD COLUMN IF NOT EXISTS natureza_operacao TEXT DEFAULT 'Venda de mercadoria',
  ADD COLUMN IF NOT EXISTS cfop_padrao       TEXT DEFAULT '5102';

-- Histórico de NF-e por pedido
-- A tabela notas_fiscais já foi criada em erp_completo.sql
-- Apenas adiciona o índice de busca por order_id
CREATE INDEX IF NOT EXISTS notas_fiscais_order_id_idx ON notas_fiscais(order_id);
CREATE INDEX IF NOT EXISTS notas_fiscais_status_idx   ON notas_fiscais(status);
