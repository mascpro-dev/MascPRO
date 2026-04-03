-- Membros da equipe do salão (mesmo login / professional_id = dono da conta).

CREATE TABLE IF NOT EXISTS public.pro_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  role_label text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_staff_owner_active ON public.pro_staff (owner_id, active);
CREATE INDEX IF NOT EXISTS idx_pro_staff_owner_sort ON public.pro_staff (owner_id, sort_order);

COMMENT ON TABLE public.pro_staff IS 'Profissionais da equipe sob a mesma conta (agenda multi-profissional).';
