-- ============================================================
-- Força de vendas — fase de dados (aditiva)
--
-- NÃO apaga pedido, lead, estoque nem comissão.
-- NÃO reclassifica gestor_tipo de pedido antigo.
-- Pedido antigo fica com order_group_id nulo e continua valendo.
--
-- Rodar no SQL Editor do Supabase, uma vez, depois de:
--   crm_schema.sql
--   crm_vendedor_equipe.sql
--   crm_pedido_fechamento.sql
--   crm_vendedor_visitas_metas.sql (ou fix_crm_visitas_grants.sql)
--   pro_inventory.sql
--
-- Este arquivo não foi aplicado automaticamente.
-- ============================================================

-- ── 1. Agrupador comercial ────────────────────────────────
-- Liga os pedidos de cada origem. Não tem valor financeiro próprio.
-- A receita continua em orders.

CREATE TABLE IF NOT EXISTS public.order_groups (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  vendedor_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  distribuidor_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  crm_lead_id       UUID        REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  crm_visita_id     UUID        REFERENCES public.crm_visitas(id) ON DELETE SET NULL,
  profile_id        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  idempotency_key   TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'simulada', 'confirmando', 'parcial', 'confirmada', 'cancelada')),
  cidade            TEXT,
  estado            TEXT,
  observacao        TEXT,
  UNIQUE (vendedor_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_order_groups_lead
  ON public.order_groups (crm_lead_id);
CREATE INDEX IF NOT EXISTS idx_order_groups_visita
  ON public.order_groups (crm_visita_id);
CREATE INDEX IF NOT EXISTS idx_order_groups_distribuidor
  ON public.order_groups (distribuidor_id, created_at DESC);

COMMENT ON TABLE public.order_groups IS
  'Compra vista pelo vendedor. Não somar este registro na receita: os pedidos filhos é que faturam.';

-- ── 2. Pedidos de cada origem ─────────────────────────────
-- origem_abastecimento nulo = pedido legado, anterior a esta fase.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_group_id UUID REFERENCES public.order_groups(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS origem_abastecimento TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS frete_status TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS frete_motivo TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS prazo_expedicao_dias_uteis INTEGER;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS prazo_tipo TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS liberado_expedicao_em TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_origem_abastecimento_check') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_origem_abastecimento_check
      CHECK (origem_abastecimento IS NULL OR origem_abastecimento IN ('distribuidor', 'empresa'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_frete_status_check') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_frete_status_check
      CHECK (frete_status IS NULL OR frete_status IN ('calculado', 'pendente', 'isento', 'recusado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_prazo_tipo_check') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_prazo_tipo_check
      CHECK (prazo_tipo IS NULL OR prazo_tipo = 'expedicao');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_order_group
  ON public.orders (order_group_id);

CREATE UNIQUE INDEX IF NOT EXISTS orders_group_origem_uidx
  ON public.orders (order_group_id, origem_abastecimento)
  WHERE order_group_id IS NOT NULL AND origem_abastecimento IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_origem_uidx
  ON public.orders (vendedor_id, origem_abastecimento, idempotency_key)
  WHERE vendedor_id IS NOT NULL
    AND origem_abastecimento IS NOT NULL
    AND idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.orders.origem_abastecimento IS
  'Quem abastece e fatura esta parcela: distribuidor ou empresa (MASC PRO). Nulo em pedido antigo.';
COMMENT ON COLUMN public.orders.prazo_tipo IS
  'expedicao = saída da operação. Não é data de entrega.';
COMMENT ON COLUMN public.orders.frete_status IS
  'pendente = sem cotação válida. Não gravar valor inventado em shipping_cost nesse caso.';

-- ── 3. Alocação e reserva ─────────────────────────────────
-- A reserva trava saldo. Nesta fase ela não baixa products.stock nem pro_inventory.
-- A baixa atual da loja (estoque_baixa_aplicada) permanece para o fluxo antigo.

CREATE TABLE IF NOT EXISTS public.inventory_allocations (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_group_id           UUID        NOT NULL REFERENCES public.order_groups(id) ON DELETE CASCADE,
  product_id               UUID        NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  idempotency_key          TEXT        NOT NULL UNIQUE,
  quantidade_solicitada    INTEGER     NOT NULL CHECK (quantidade_solicitada > 0),
  quantidade_distribuidor  INTEGER     NOT NULL DEFAULT 0 CHECK (quantidade_distribuidor >= 0),
  quantidade_empresa       INTEGER     NOT NULL DEFAULT 0 CHECK (quantidade_empresa >= 0),
  quantidade_nao_atendida  INTEGER     NOT NULL DEFAULT 0 CHECK (quantidade_nao_atendida >= 0),
  status                   TEXT        NOT NULL DEFAULT 'provisoria'
    CHECK (status IN ('provisoria', 'revalidada', 'divergente', 'consumida', 'liberada')),
  CHECK (
    quantidade_solicitada
    = quantidade_distribuidor + quantidade_empresa + quantidade_nao_atendida
  )
);

CREATE INDEX IF NOT EXISTS idx_inventory_allocations_group
  ON public.inventory_allocations (order_group_id);

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_group_id    UUID        NOT NULL REFERENCES public.order_groups(id) ON DELETE CASCADE,
  allocation_id     UUID        REFERENCES public.inventory_allocations(id) ON DELETE CASCADE,
  order_id          UUID        REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id        UUID        NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  origem            TEXT        NOT NULL CHECK (origem IN ('distribuidor', 'empresa')),
  distribuidor_id   UUID        REFERENCES public.profiles(id) ON DELETE RESTRICT,
  quantidade        INTEGER     NOT NULL CHECK (quantidade > 0),
  status            TEXT        NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'consumida', 'liberada', 'expirada')),
  expira_em         TIMESTAMPTZ NOT NULL,
  idempotency_key   TEXT        NOT NULL,
  created_by        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  estoque_baixado   BOOLEAN     NOT NULL DEFAULT false,
  UNIQUE (idempotency_key, origem),
  CHECK (origem <> 'distribuidor' OR distribuidor_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_produto
  ON public.inventory_reservations (product_id, origem, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_dist
  ON public.inventory_reservations (distribuidor_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expira
  ON public.inventory_reservations (expira_em)
  WHERE status = 'ativa';

COMMENT ON TABLE public.inventory_reservations IS
  'Trava de venda. estoque_baixado fica false até a confirmação descontar o saldo da origem.';

-- ── 4. Frete e prazo ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shipping_quotes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_group_id   UUID        REFERENCES public.order_groups(id) ON DELETE CASCADE,
  order_id         UUID        REFERENCES public.orders(id) ON DELETE SET NULL,
  origem           TEXT        NOT NULL CHECK (origem IN ('distribuidor', 'empresa')),
  status           TEXT        NOT NULL CHECK (status IN ('calculado', 'pendente', 'isento', 'recusado')),
  valor            NUMERIC(12,2),
  motivo           TEXT,
  cep_destino      TEXT,
  cep_origem       TEXT,
  peso_gramas      INTEGER,
  servico          TEXT,
  distribuidor_id  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  CHECK (
    (status = 'pendente' AND valor IS NULL)
    OR (status = 'recusado' AND valor IS NULL)
    OR (status = 'isento' AND valor = 0)
    OR (status = 'calculado' AND valor IS NOT NULL AND valor >= 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_shipping_quotes_group
  ON public.shipping_quotes (order_group_id, origem);

COMMENT ON TABLE public.shipping_quotes IS
  'Cotação por origem. Status pendente guarda valor nulo de propósito.';

CREATE TABLE IF NOT EXISTS public.shipping_sla_rules (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  origem           TEXT        NOT NULL CHECK (origem IN ('distribuidor', 'empresa')),
  distribuidor_id  UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  uf               TEXT,
  escopo           TEXT        NOT NULL CHECK (escopo IN ('uf', 'demais')),
  dias_uteis       INTEGER     NOT NULL CHECK (dias_uteis > 0),
  hora_corte       TIME,
  ativo            BOOLEAN     NOT NULL DEFAULT true,
  CHECK (
    (escopo = 'uf' AND uf IS NOT NULL)
    OR (escopo = 'demais' AND uf IS NULL)
  ),
  CHECK (origem <> 'distribuidor' OR distribuidor_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS shipping_sla_rules_uidx
  ON public.shipping_sla_rules (
    origem,
    COALESCE(distribuidor_id, '00000000-0000-0000-0000-000000000000'::uuid),
    escopo,
    COALESCE(uf, '')
  );

COMMENT ON TABLE public.shipping_sla_rules IS
  'Prazo máximo de expedição em dias úteis. hora_corte nula = sem corte até alguém configurar.';

CREATE TABLE IF NOT EXISTS public.shipping_holidays (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  data          DATE        NOT NULL,
  nome          TEXT        NOT NULL,
  uf            TEXT,
  abrangencia   TEXT        NOT NULL CHECK (abrangencia IN ('nacional', 'uf')),
  CHECK (
    (abrangencia = 'nacional' AND uf IS NULL)
    OR (abrangencia = 'uf' AND uf IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS shipping_holidays_data_uf_uidx
  ON public.shipping_holidays (data, COALESCE(uf, ''));

-- Regras centrais. Não cria prazo de distribuidor.
INSERT INTO public.shipping_sla_rules (origem, distribuidor_id, uf, escopo, dias_uteis, hora_corte, ativo)
SELECT 'empresa', NULL, 'SP', 'uf', 3, NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.shipping_sla_rules
  WHERE origem = 'empresa' AND distribuidor_id IS NULL AND escopo = 'uf' AND uf = 'SP'
);

INSERT INTO public.shipping_sla_rules (origem, distribuidor_id, uf, escopo, dias_uteis, hora_corte, ativo)
SELECT 'empresa', NULL, NULL, 'demais', 7, NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.shipping_sla_rules
  WHERE origem = 'empresa' AND distribuidor_id IS NULL AND escopo = 'demais'
);

-- Feriados nacionais. Carnaval não entra: não é feriado federal.
-- Feriado municipal ou do distribuidor se inclui depois, por UF.
INSERT INTO public.shipping_holidays (data, nome, uf, abrangencia)
SELECT v.data, v.nome, NULL, 'nacional'
FROM (
  VALUES
    (DATE '2026-01-01', 'Confraternização Universal'),
    (DATE '2026-04-03', 'Sexta-feira Santa'),
    (DATE '2026-04-21', 'Tiradentes'),
    (DATE '2026-05-01', 'Dia do Trabalho'),
    (DATE '2026-09-07', 'Independência do Brasil'),
    (DATE '2026-10-12', 'Nossa Senhora Aparecida'),
    (DATE '2026-11-02', 'Finados'),
    (DATE '2026-11-15', 'Proclamação da República'),
    (DATE '2026-11-20', 'Dia da Consciência Negra'),
    (DATE '2026-12-25', 'Natal'),
    (DATE '2027-01-01', 'Confraternização Universal'),
    (DATE '2027-03-26', 'Sexta-feira Santa'),
    (DATE '2027-04-21', 'Tiradentes'),
    (DATE '2027-05-01', 'Dia do Trabalho'),
    (DATE '2027-09-07', 'Independência do Brasil'),
    (DATE '2027-10-12', 'Nossa Senhora Aparecida'),
    (DATE '2027-11-02', 'Finados'),
    (DATE '2027-11-15', 'Proclamação da República'),
    (DATE '2027-11-20', 'Dia da Consciência Negra'),
    (DATE '2027-12-25', 'Natal')
) AS v(data, nome)
WHERE NOT EXISTS (
  SELECT 1 FROM public.shipping_holidays h
  WHERE h.data = v.data AND h.uf IS NULL
);

-- ── 5. Visita e rota ──────────────────────────────────────
-- crm_visitas já existe. Aqui só entram check-in e encerramento.

ALTER TABLE public.crm_visitas
  ADD COLUMN IF NOT EXISTS objetivo TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS checkin_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checkin_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS checkin_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS checkin_manual BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkin_justificativa TEXT,
  ADD COLUMN IF NOT EXISTS encerrada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proxima_acao TEXT,
  ADD COLUMN IF NOT EXISTS proxima_acao_em DATE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_visitas_checkin_manual_justificativa') THEN
    ALTER TABLE public.crm_visitas
      ADD CONSTRAINT crm_visitas_checkin_manual_justificativa
      CHECK (
        checkin_manual = false
        OR (checkin_justificativa IS NOT NULL AND length(btrim(checkin_justificativa)) > 0)
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sales_routes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  vendedor_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  distribuidor_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cidade           TEXT        NOT NULL,
  uf               TEXT,
  data_rota        DATE        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'ativa', 'concluida', 'cancelada')),
  UNIQUE (vendedor_id, data_rota, cidade)
);

CREATE TABLE IF NOT EXISTS public.sales_route_stops (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  route_id       UUID        NOT NULL REFERENCES public.sales_routes(id) ON DELETE CASCADE,
  crm_lead_id    UUID        NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  ordem          INTEGER     NOT NULL CHECK (ordem > 0),
  planejada      BOOLEAN     NOT NULL DEFAULT true,
  crm_visita_id  UUID        REFERENCES public.crm_visitas(id) ON DELETE SET NULL,
  status         TEXT        NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_visita', 'concluida', 'pulada')),
  UNIQUE (route_id, ordem),
  UNIQUE (route_id, crm_lead_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_routes_vendedor
  ON public.sales_routes (vendedor_id, data_rota);
CREATE INDEX IF NOT EXISTS idx_sales_route_stops_lead
  ON public.sales_route_stops (crm_lead_id);

-- ── 6. Auditoria comercial ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.commercial_audit_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_group_id   UUID        REFERENCES public.order_groups(id) ON DELETE SET NULL,
  order_id         UUID        REFERENCES public.orders(id) ON DELETE SET NULL,
  crm_lead_id      UUID        REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  crm_visita_id    UUID        REFERENCES public.crm_visitas(id) ON DELETE SET NULL,
  tipo             TEXT        NOT NULL,
  payload          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key  TEXT        UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_commercial_audit_group
  ON public.commercial_audit_events (order_group_id, created_at DESC);

-- ── 7. updated_at ─────────────────────────────────────────

DROP TRIGGER IF EXISTS order_groups_updated_at ON public.order_groups;
CREATE TRIGGER order_groups_updated_at
  BEFORE UPDATE ON public.order_groups
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS inventory_reservations_updated_at ON public.inventory_reservations;
CREATE TRIGGER inventory_reservations_updated_at
  BEFORE UPDATE ON public.inventory_reservations
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS shipping_sla_rules_updated_at ON public.shipping_sla_rules;
CREATE TRIGGER shipping_sla_rules_updated_at
  BEFORE UPDATE ON public.shipping_sla_rules
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS sales_routes_updated_at ON public.sales_routes;
CREATE TRIGGER sales_routes_updated_at
  BEFORE UPDATE ON public.sales_routes
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS sales_route_stops_updated_at ON public.sales_route_stops;
CREATE TRIGGER sales_route_stops_updated_at
  BEFORE UPDATE ON public.sales_route_stops
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

-- ── 8. Acesso ─────────────────────────────────────────────
-- As APIs usam service_role e ignoram RLS. A política abaixo cobre o cliente autenticado.
-- Mutação de reserva, cotação e auditoria fica só no service_role.

CREATE OR REPLACE FUNCTION public.fv_acesso_comercial(p_vendedor uuid, p_distribuidor uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    auth.uid() = p_vendedor
    OR auth.uid() = p_distribuidor
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND UPPER(TRIM(p.role)) = 'ADMIN'
    );
$$;

ALTER TABLE public.order_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_groups_select ON public.order_groups;
CREATE POLICY order_groups_select ON public.order_groups
  FOR SELECT TO authenticated
  USING (public.fv_acesso_comercial(vendedor_id, distribuidor_id));

DROP POLICY IF EXISTS inventory_allocations_select ON public.inventory_allocations;
CREATE POLICY inventory_allocations_select ON public.inventory_allocations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_groups g
      WHERE g.id = inventory_allocations.order_group_id
        AND public.fv_acesso_comercial(g.vendedor_id, g.distribuidor_id)
    )
  );

DROP POLICY IF EXISTS inventory_reservations_select ON public.inventory_reservations;
CREATE POLICY inventory_reservations_select ON public.inventory_reservations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_groups g
      WHERE g.id = inventory_reservations.order_group_id
        AND public.fv_acesso_comercial(g.vendedor_id, g.distribuidor_id)
    )
  );

DROP POLICY IF EXISTS shipping_quotes_select ON public.shipping_quotes;
CREATE POLICY shipping_quotes_select ON public.shipping_quotes
  FOR SELECT TO authenticated
  USING (
    order_group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.order_groups g
      WHERE g.id = shipping_quotes.order_group_id
        AND public.fv_acesso_comercial(g.vendedor_id, g.distribuidor_id)
    )
  );

DROP POLICY IF EXISTS shipping_sla_select ON public.shipping_sla_rules;
CREATE POLICY shipping_sla_select ON public.shipping_sla_rules
  FOR SELECT TO authenticated
  USING (ativo = true OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND UPPER(TRIM(p.role)) = 'ADMIN'
  ));

DROP POLICY IF EXISTS shipping_sla_admin ON public.shipping_sla_rules;
CREATE POLICY shipping_sla_admin ON public.shipping_sla_rules
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND UPPER(TRIM(p.role)) = 'ADMIN'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND UPPER(TRIM(p.role)) = 'ADMIN'
  ));

DROP POLICY IF EXISTS shipping_holidays_select ON public.shipping_holidays;
CREATE POLICY shipping_holidays_select ON public.shipping_holidays
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS shipping_holidays_admin ON public.shipping_holidays;
CREATE POLICY shipping_holidays_admin ON public.shipping_holidays
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND UPPER(TRIM(p.role)) = 'ADMIN'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND UPPER(TRIM(p.role)) = 'ADMIN'
  ));

DROP POLICY IF EXISTS sales_routes_all ON public.sales_routes;
CREATE POLICY sales_routes_all ON public.sales_routes
  FOR ALL TO authenticated
  USING (public.fv_acesso_comercial(vendedor_id, distribuidor_id))
  WITH CHECK (
    vendedor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          UPPER(TRIM(p.role)) = 'ADMIN'
          OR (UPPER(TRIM(p.role)) = 'DISTRIBUIDOR' AND sales_routes.distribuidor_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS sales_route_stops_all ON public.sales_route_stops;
CREATE POLICY sales_route_stops_all ON public.sales_route_stops
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales_routes r
      WHERE r.id = sales_route_stops.route_id
        AND public.fv_acesso_comercial(r.vendedor_id, r.distribuidor_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales_routes r
      WHERE r.id = sales_route_stops.route_id
        AND public.fv_acesso_comercial(r.vendedor_id, r.distribuidor_id)
    )
  );

DROP POLICY IF EXISTS commercial_audit_select ON public.commercial_audit_events;
CREATE POLICY commercial_audit_select ON public.commercial_audit_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND UPPER(TRIM(p.role)) = 'ADMIN'
    )
    OR (
      order_group_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.order_groups g
        WHERE g.id = commercial_audit_events.order_group_id
          AND public.fv_acesso_comercial(g.vendedor_id, g.distribuidor_id)
      )
    )
  );

GRANT SELECT ON public.order_groups TO authenticated;
GRANT SELECT ON public.inventory_allocations TO authenticated;
GRANT SELECT ON public.inventory_reservations TO authenticated;
GRANT SELECT ON public.shipping_quotes TO authenticated;
GRANT SELECT ON public.shipping_sla_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_holidays TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_sla_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_routes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_route_stops TO authenticated;
GRANT SELECT ON public.commercial_audit_events TO authenticated;

GRANT ALL ON public.order_groups TO service_role;
GRANT ALL ON public.inventory_allocations TO service_role;
GRANT ALL ON public.inventory_reservations TO service_role;
GRANT ALL ON public.shipping_quotes TO service_role;
GRANT ALL ON public.shipping_sla_rules TO service_role;
GRANT ALL ON public.shipping_holidays TO service_role;
GRANT ALL ON public.sales_routes TO service_role;
GRANT ALL ON public.sales_route_stops TO service_role;
GRANT ALL ON public.commercial_audit_events TO service_role;

GRANT EXECUTE ON FUNCTION public.fv_acesso_comercial(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON TABLE public.order_groups FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.inventory_allocations FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.inventory_reservations FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.shipping_quotes FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.shipping_sla_rules FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.shipping_holidays FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.sales_routes FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.sales_route_stops FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.commercial_audit_events FROM PUBLIC, anon;

-- ── 9. Reserva com trava ──────────────────────────────────
-- Mesma conta de lib/forcaVendasRegras.ts: distribuidor primeiro, central depois.
-- Reenvio da mesma idempotency_key devolve a alocação já gravada.

CREATE OR REPLACE FUNCTION public.fv_alocar_item(
  p_order_group_id uuid,
  p_product_id uuid,
  p_distribuidor_id uuid,
  p_quantidade integer,
  p_idempotency_key text,
  p_actor_id uuid,
  p_expira_em timestamptz DEFAULT (now() + interval '45 minutes')
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existente public.inventory_allocations%ROWTYPE;
  v_stock numeric;
  v_local integer;
  v_reservado_empresa integer;
  v_reservado_local integer;
  v_disp_empresa integer;
  v_disp_local integer;
  v_qtd_local integer;
  v_qtd_empresa integer;
  v_qtd_falta integer;
  v_allocation_id uuid;
BEGIN
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'quantidade invalida');
  END IF;
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'idempotency_key obrigatoria');
  END IF;
  IF p_distribuidor_id IS NULL OR p_order_group_id IS NULL OR p_product_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'vinculo obrigatorio ausente');
  END IF;

  SELECT * INTO v_existente
  FROM public.inventory_allocations
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotente', true,
      'allocation_id', v_existente.id,
      'solicitada', v_existente.quantidade_solicitada,
      'distribuidor', v_existente.quantidade_distribuidor,
      'empresa', v_existente.quantidade_empresa,
      'nao_atendida', v_existente.quantidade_nao_atendida,
      'status', v_existente.status
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_product_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_distribuidor_id::text || ':' || p_product_id::text, 1));

  UPDATE public.inventory_reservations
  SET status = 'expirada'
  WHERE status = 'ativa'
    AND expira_em <= now()
    AND product_id = p_product_id
    AND (origem = 'empresa' OR distribuidor_id = p_distribuidor_id);

  SELECT stock::numeric INTO v_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'produto nao encontrado');
  END IF;

  PERFORM 1
  FROM public.pro_inventory
  WHERE professional_id = p_distribuidor_id
    AND product_id = p_product_id
  FOR UPDATE;

  SELECT COALESCE(FLOOR(SUM(quantity)), 0)::integer INTO v_local
  FROM public.pro_inventory
  WHERE professional_id = p_distribuidor_id
    AND product_id = p_product_id;

  SELECT COALESCE(SUM(quantidade), 0) INTO v_reservado_empresa
  FROM public.inventory_reservations
  WHERE product_id = p_product_id
    AND origem = 'empresa'
    AND status = 'ativa';

  SELECT COALESCE(SUM(quantidade), 0) INTO v_reservado_local
  FROM public.inventory_reservations
  WHERE product_id = p_product_id
    AND origem = 'distribuidor'
    AND distribuidor_id = p_distribuidor_id
    AND status = 'ativa';

  v_disp_empresa := GREATEST(FLOOR(COALESCE(v_stock, 0))::integer - v_reservado_empresa, 0);
  v_disp_local := GREATEST(COALESCE(v_local, 0) - v_reservado_local, 0);
  v_qtd_local := LEAST(p_quantidade, v_disp_local);
  v_qtd_empresa := LEAST(p_quantidade - v_qtd_local, v_disp_empresa);
  v_qtd_falta := p_quantidade - v_qtd_local - v_qtd_empresa;

  INSERT INTO public.inventory_allocations (
    order_group_id, product_id, idempotency_key,
    quantidade_solicitada, quantidade_distribuidor, quantidade_empresa, quantidade_nao_atendida
  ) VALUES (
    p_order_group_id, p_product_id, p_idempotency_key,
    p_quantidade, v_qtd_local, v_qtd_empresa, v_qtd_falta
  )
  RETURNING id INTO v_allocation_id;

  IF v_qtd_local > 0 THEN
    INSERT INTO public.inventory_reservations (
      order_group_id, allocation_id, product_id, origem, distribuidor_id,
      quantidade, expira_em, idempotency_key, created_by
    ) VALUES (
      p_order_group_id, v_allocation_id, p_product_id, 'distribuidor', p_distribuidor_id,
      v_qtd_local, p_expira_em, p_idempotency_key, p_actor_id
    );
  END IF;

  IF v_qtd_empresa > 0 THEN
    INSERT INTO public.inventory_reservations (
      order_group_id, allocation_id, product_id, origem, distribuidor_id,
      quantidade, expira_em, idempotency_key, created_by
    ) VALUES (
      p_order_group_id, v_allocation_id, p_product_id, 'empresa', p_distribuidor_id,
      v_qtd_empresa, p_expira_em, p_idempotency_key, p_actor_id
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotente', false,
    'allocation_id', v_allocation_id,
    'solicitada', p_quantidade,
    'distribuidor', v_qtd_local,
    'empresa', v_qtd_empresa,
    'nao_atendida', v_qtd_falta,
    'disponivel_distribuidor', v_disp_local,
    'disponivel_empresa', v_disp_empresa,
    'status', 'provisoria'
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existente
    FROM public.inventory_allocations
    WHERE idempotency_key = p_idempotency_key;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'conflito de reserva');
    END IF;
    RETURN jsonb_build_object(
      'ok', true,
      'idempotente', true,
      'allocation_id', v_existente.id,
      'solicitada', v_existente.quantidade_solicitada,
      'distribuidor', v_existente.quantidade_distribuidor,
      'empresa', v_existente.quantidade_empresa,
      'nao_atendida', v_existente.quantidade_nao_atendida,
      'status', v_existente.status
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fv_revalidar_alocacao(p_idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aloc public.inventory_allocations%ROWTYPE;
  v_stock numeric;
  v_local integer;
  v_outras_empresa integer;
  v_outras_local integer;
  v_disp_empresa integer;
  v_disp_local integer;
  v_dist_id uuid;
  v_ok boolean;
BEGIN
  SELECT * INTO v_aloc
  FROM public.inventory_allocations
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'alocacao nao encontrada');
  END IF;

  SELECT distribuidor_id INTO v_dist_id
  FROM public.inventory_reservations
  WHERE allocation_id = v_aloc.id
  ORDER BY created_at
  LIMIT 1;

  IF v_dist_id IS NULL THEN
    SELECT distribuidor_id INTO v_dist_id
    FROM public.order_groups
    WHERE id = v_aloc.order_group_id;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_aloc.product_id::text, 0));

  UPDATE public.inventory_reservations
  SET status = 'expirada'
  WHERE status = 'ativa'
    AND expira_em <= now()
    AND product_id = v_aloc.product_id
    AND id NOT IN (
      SELECT id FROM public.inventory_reservations WHERE allocation_id = v_aloc.id
    );

  SELECT stock::numeric INTO v_stock
  FROM public.products
  WHERE id = v_aloc.product_id
  FOR UPDATE;

  SELECT COALESCE(FLOOR(SUM(quantity)), 0)::integer INTO v_local
  FROM public.pro_inventory
  WHERE professional_id = v_dist_id
    AND product_id = v_aloc.product_id;

  SELECT COALESCE(SUM(quantidade), 0) INTO v_outras_empresa
  FROM public.inventory_reservations
  WHERE product_id = v_aloc.product_id
    AND origem = 'empresa'
    AND status = 'ativa'
    AND allocation_id IS DISTINCT FROM v_aloc.id;

  SELECT COALESCE(SUM(quantidade), 0) INTO v_outras_local
  FROM public.inventory_reservations
  WHERE product_id = v_aloc.product_id
    AND origem = 'distribuidor'
    AND distribuidor_id = v_dist_id
    AND status = 'ativa'
    AND allocation_id IS DISTINCT FROM v_aloc.id;

  v_disp_empresa := GREATEST(FLOOR(COALESCE(v_stock, 0))::integer - COALESCE(v_outras_empresa, 0), 0);
  v_disp_local := GREATEST(COALESCE(v_local, 0) - COALESCE(v_outras_local, 0), 0);
  v_ok := v_aloc.quantidade_distribuidor <= v_disp_local
    AND v_aloc.quantidade_empresa <= v_disp_empresa;

  UPDATE public.inventory_allocations
  SET status = CASE WHEN v_ok THEN 'revalidada' ELSE 'divergente' END
  WHERE id = v_aloc.id;

  RETURN jsonb_build_object(
    'ok', true,
    'confirma', v_ok,
    'status', CASE WHEN v_ok THEN 'revalidada' ELSE 'divergente' END,
    'distribuidor', v_aloc.quantidade_distribuidor,
    'empresa', v_aloc.quantidade_empresa,
    'disponivel_distribuidor', v_disp_local,
    'disponivel_empresa', v_disp_empresa
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fv_liberar_reserva(p_reservation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.inventory_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.inventory_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reserva nao encontrada');
  END IF;

  IF v_row.status <> 'ativa' THEN
    RETURN jsonb_build_object('ok', true, 'idempotente', true, 'status', v_row.status);
  END IF;

  IF v_row.estoque_baixado THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reserva ja baixou estoque; cancelamento ainda nao restaura saldo');
  END IF;

  UPDATE public.inventory_reservations
  SET status = 'liberada'
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object('ok', true, 'status', 'liberada', 'quantidade', v_row.quantidade);
END;
$$;

-- Prazo de expedição em dias úteis, no fuso de São Paulo.
-- Distribuidor sem regra própria devolve aplicado = false. Não usa 3 nem 7.

CREATE OR REPLACE FUNCTION public.fv_eh_dia_util(p_data date, p_uf text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    EXTRACT(ISODOW FROM p_data) < 6
    AND NOT EXISTS (
      SELECT 1 FROM public.shipping_holidays h
      WHERE h.data = p_data
        AND (h.uf IS NULL OR h.uf = UPPER(TRIM(COALESCE(p_uf, ''))))
    );
$$;

CREATE OR REPLACE FUNCTION public.fv_data_limite_expedicao(
  p_inicio date,
  p_dias integer,
  p_uf text
)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cursor date := p_inicio;
  v_restantes integer;
BEGIN
  IF p_dias IS NULL OR p_dias <= 0 THEN
    RETURN NULL;
  END IF;
  WHILE NOT public.fv_eh_dia_util(v_cursor, p_uf) LOOP
    v_cursor := v_cursor + 1;
  END LOOP;
  v_restantes := p_dias - 1;
  WHILE v_restantes > 0 LOOP
    v_cursor := v_cursor + 1;
    IF public.fv_eh_dia_util(v_cursor, p_uf) THEN
      v_restantes := v_restantes - 1;
    END IF;
  END LOOP;
  RETURN v_cursor;
END;
$$;

CREATE OR REPLACE FUNCTION public.fv_prazo_expedicao(
  p_origem text,
  p_distribuidor_id uuid,
  p_uf text,
  p_liberado timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uf text := UPPER(TRIM(COALESCE(p_uf, '')));
  v_regra public.shipping_sla_rules%ROWTYPE;
  v_local timestamp;
  v_inicio date;
  v_limite date;
BEGIN
  IF v_uf = '' THEN
    RETURN jsonb_build_object('aplicado', false, 'dias_uteis', NULL, 'data_limite', NULL, 'motivo', 'sem_uf');
  END IF;

  IF p_origem = 'distribuidor' THEN
    SELECT * INTO v_regra
    FROM public.shipping_sla_rules
    WHERE ativo
      AND origem = 'distribuidor'
      AND distribuidor_id = p_distribuidor_id
      AND escopo = 'uf'
      AND uf = v_uf
    LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO v_regra
      FROM public.shipping_sla_rules
      WHERE ativo
        AND origem = 'distribuidor'
        AND distribuidor_id = p_distribuidor_id
        AND escopo = 'demais'
      LIMIT 1;
    END IF;
  ELSE
    SELECT * INTO v_regra
    FROM public.shipping_sla_rules
    WHERE ativo
      AND origem = 'empresa'
      AND distribuidor_id IS NULL
      AND escopo = 'uf'
      AND uf = v_uf
    LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO v_regra
      FROM public.shipping_sla_rules
      WHERE ativo
        AND origem = 'empresa'
        AND distribuidor_id IS NULL
        AND escopo = 'demais'
      LIMIT 1;
    END IF;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('aplicado', false, 'dias_uteis', NULL, 'data_limite', NULL, 'motivo', 'sem_regra');
  END IF;

  v_local := p_liberado AT TIME ZONE 'America/Sao_Paulo';
  v_inicio := v_local::date;
  IF v_regra.hora_corte IS NOT NULL AND v_local::time > v_regra.hora_corte THEN
    v_inicio := v_inicio + 1;
  END IF;
  v_limite := public.fv_data_limite_expedicao(v_inicio, v_regra.dias_uteis, v_uf);

  RETURN jsonb_build_object(
    'aplicado', true,
    'dias_uteis', v_regra.dias_uteis,
    'data_limite', v_limite,
    'motivo', 'expedicao'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fv_alocar_item(uuid, uuid, uuid, integer, text, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fv_revalidar_alocacao(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fv_liberar_reserva(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fv_alocar_item(uuid, uuid, uuid, integer, text, uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.fv_revalidar_alocacao(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fv_liberar_reserva(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.fv_eh_dia_util(date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fv_data_limite_expedicao(date, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fv_prazo_expedicao(text, uuid, text, timestamptz) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
