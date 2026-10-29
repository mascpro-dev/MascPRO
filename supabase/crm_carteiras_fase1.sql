-- ============================================================
-- Carteiras comerciais — Fase 1 (somente ADD)
-- Não DROP, não apaga leads, não troca o pipeline.
-- Rodar no SQL Editor do Supabase.
-- ============================================================

-- Endereço que hoje vai para notas na importação
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS telefone_normalizado TEXT;

-- Dimensões da carteira (independentes do status do kanban)
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS perfil_comercial TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS relacionamento TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS resultado_atendimento TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS proxima_acao TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS proxima_acao_em DATE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS proxima_acao_justificativa TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS lote_importacao_id UUID;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS compartilhado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS ultimo_atendimento_em TIMESTAMPTZ;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS ultimo_atendimento_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_perfil_comercial_check') THEN
    ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_perfil_comercial_check
      CHECK (perfil_comercial IS NULL OR perfil_comercial IN (
        'nao_verificado','cabeleireiro','salao','distribuidor','outro_profissional','fora_perfil','atividade_encerrada'
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_relacionamento_check') THEN
    ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_relacionamento_check
      CHECK (relacionamento IS NULL OR relacionamento IN (
        'nao_identificado','nunca_ouviu','conhece_nunca_comprou','ja_comprou','cliente_ativo','cliente_inativo'
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_resultado_atendimento_check') THEN
    ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_resultado_atendimento_check
      CHECK (resultado_atendimento IS NULL OR resultado_atendimento IN (
        'nao_abordado','contato_nao_efetivado','decisor_nao_localizado','contato_decisor','apresentacao',
        'catalogo_enviado','visita_agendada','visita_realizada','proposta_enviada','negociacao',
        'compra_confirmada','sem_interesse','contato_invalido'
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_proxima_acao_check') THEN
    ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_proxima_acao_check
      CHECK (proxima_acao IS NULL OR proxima_acao IN (
        'tentar_contato','falar_decisor','apresentar_marca','enviar_catalogo','agendar_visita',
        'realizar_visita','enviar_proposta','negociar','confirmar_pedido','pos_venda','recompra','reativar','nenhuma'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS crm_leads_cidade_uf_idx ON public.crm_leads (cidade, estado);
CREATE INDEX IF NOT EXISTS crm_leads_telefone_norm_idx ON public.crm_leads (telefone_normalizado);
CREATE INDEX IF NOT EXISTS crm_leads_proxima_acao_em_idx ON public.crm_leads (proxima_acao_em);
CREATE INDEX IF NOT EXISTS crm_leads_perfil_comercial_idx ON public.crm_leads (perfil_comercial);
CREATE INDEX IF NOT EXISTS crm_leads_resultado_idx ON public.crm_leads (resultado_atendimento);
CREATE INDEX IF NOT EXISTS crm_leads_lote_idx ON public.crm_leads (lote_importacao_id);

-- Preenche perfil comercial a partir do perfil antigo, sem apagar o antigo
UPDATE public.crm_leads
SET perfil_comercial = CASE perfil
  WHEN 'cabeleireiro' THEN 'cabeleireiro'
  WHEN 'salao' THEN 'salao'
  WHEN 'distribuidor' THEN 'distribuidor'
  WHEN 'embaixadora' THEN 'outro_profissional'
  ELSE 'nao_verificado'
END
WHERE perfil_comercial IS NULL;

UPDATE public.crm_leads
SET resultado_atendimento = 'nao_abordado'
WHERE resultado_atendimento IS NULL AND status = 'novo';

-- Lotes de importação
CREATE TABLE IF NOT EXISTS public.crm_import_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  arquivo_nome TEXT,
  origem_lista TEXT,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_linhas INT NOT NULL DEFAULT 0,
  criados INT NOT NULL DEFAULT 0,
  atualizados INT NOT NULL DEFAULT 0,
  ignorados INT NOT NULL DEFAULT 0,
  duplicados INT NOT NULL DEFAULT 0,
  erros INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.crm_import_linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.crm_import_lotes(id) ON DELETE CASCADE,
  linha INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok','erro','duplicado','ignorado','atualizado')),
  motivo TEXT,
  payload JSONB,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS crm_import_linhas_lote_idx ON public.crm_import_linhas (lote_id);

ALTER TABLE public.crm_leads
  DROP CONSTRAINT IF EXISTS crm_leads_lote_importacao_fkey;
ALTER TABLE public.crm_leads
  ADD CONSTRAINT crm_leads_lote_importacao_fkey
  FOREIGN KEY (lote_importacao_id) REFERENCES public.crm_import_lotes(id) ON DELETE SET NULL;

-- Histórico de transferência de carteira (não apaga o lead)
CREATE TABLE IF NOT EXISTS public.crm_transferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  de_responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  para_responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  autor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  motivo TEXT
);

CREATE INDEX IF NOT EXISTS crm_transferencias_lead_idx ON public.crm_transferencias (lead_id, created_at DESC);

-- Atendimentos estruturados (crm_atividades continua existindo)
CREATE TABLE IF NOT EXISTS public.crm_atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'ligacao','whatsapp','visita','reuniao','apresentacao','proposta','pos_venda','outro'
  )),
  resultado TEXT CHECK (resultado IS NULL OR resultado IN (
    'nao_abordado','contato_nao_efetivado','decisor_nao_localizado','contato_decisor','apresentacao',
    'catalogo_enviado','visita_agendada','visita_realizada','proposta_enviada','negociacao',
    'compra_confirmada','sem_interesse','contato_invalido'
  )),
  observacoes TEXT,
  proxima_acao TEXT,
  previsto_em DATE,
  concluido_em TIMESTAMPTZ,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  visita_id UUID REFERENCES public.crm_visitas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS crm_atendimentos_lead_idx ON public.crm_atendimentos (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_atendimentos_autor_idx ON public.crm_atendimentos (autor_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.crm_leads TO authenticated;
GRANT SELECT, INSERT ON public.crm_atividades TO authenticated;
GRANT ALL ON public.crm_import_lotes TO authenticated, service_role;
GRANT ALL ON public.crm_import_linhas TO authenticated, service_role;
GRANT ALL ON public.crm_transferencias TO authenticated, service_role;
GRANT ALL ON public.crm_atendimentos TO authenticated, service_role;

ALTER TABLE public.crm_import_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_import_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_atendimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_carteira_admin_dist" ON public.crm_import_lotes;
CREATE POLICY "crm_carteira_admin_dist" ON public.crm_import_lotes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN','DISTRIBUIDOR'))
);

DROP POLICY IF EXISTS "crm_carteira_linhas_admin_dist" ON public.crm_import_linhas;
CREATE POLICY "crm_carteira_linhas_admin_dist" ON public.crm_import_linhas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN','DISTRIBUIDOR'))
);

DROP POLICY IF EXISTS "crm_transf_acesso" ON public.crm_transferencias;
CREATE POLICY "crm_transf_acesso" ON public.crm_transferencias FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  OR autor_id = auth.uid()
  OR de_responsavel_id = auth.uid()
  OR para_responsavel_id = auth.uid()
);

DROP POLICY IF EXISTS "crm_atendimentos_acesso" ON public.crm_atendimentos;
CREATE POLICY "crm_atendimentos_acesso" ON public.crm_atendimentos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  OR autor_id = auth.uid()
  OR lead_id IN (
    SELECT id FROM crm_leads
    WHERE created_by = auth.uid() OR responsavel_id = auth.uid()
  )
);

-- Vendedor: só a própria carteira (o backend com service_role continua acima do RLS)
DROP POLICY IF EXISTS "crm_leads_vendedor" ON public.crm_leads;
CREATE POLICY "crm_leads_vendedor" ON public.crm_leads
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'VENDEDOR')
    AND (created_by = auth.uid() OR responsavel_id = auth.uid() OR compartilhado = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'VENDEDOR')
    AND (created_by = auth.uid() OR responsavel_id = auth.uid())
  );
