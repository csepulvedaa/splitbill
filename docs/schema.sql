-- SplitBill — Schema Supabase
-- Ejecutar en el SQL Editor de Supabase

-- ─── BILLS ───────────────────────────────────────────────────────────────────
CREATE TABLE bills (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz DEFAULT now(),
  restaurant           text,
  currency             text DEFAULT 'CLP',
  subtotal_declared    numeric,
  tip_included         boolean DEFAULT false,
  tip_included_amount  numeric,
  total_declared       numeric,
  tip_manual_enabled   boolean DEFAULT true,
  ocr_confidence       text DEFAULT 'alta',  -- 'alta' | 'media' | 'baja'
  ocr_notes            text[] DEFAULT '{}',
  status               text DEFAULT 'complete',
  expires_at           timestamptz DEFAULT now() + interval '30 days'
);

-- ─── ITEMS ───────────────────────────────────────────────────────────────────
CREATE TABLE items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id           uuid REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
  nombre            text NOT NULL,
  cantidad          integer DEFAULT 1,
  precio_unitario   numeric,
  precio_total      numeric,
  confianza_item    text DEFAULT 'alta',
  nota_item         text,
  is_manually_added boolean DEFAULT false,
  orden             integer DEFAULT 0
);

-- ─── PARTICIPANTS ─────────────────────────────────────────────────────────────
CREATE TABLE participants (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id  uuid REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
  nombre   text NOT NULL,
  orden    integer DEFAULT 0
);

-- ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  participant_id  uuid REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  fraccion        numeric NOT NULL,
  monto_asignado  numeric NOT NULL
);

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────
CREATE INDEX items_bill_id_idx        ON items(bill_id);
CREATE INDEX participants_bill_id_idx ON participants(bill_id);
CREATE INDEX assignments_item_id_idx  ON assignments(item_id);
CREATE INDEX assignments_part_id_idx  ON assignments(participant_id);

-- ─── RLS — Row Level Security ─────────────────────────────────────────────────
ALTER TABLE bills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments  ENABLE ROW LEVEL SECURITY;

-- Lectura pública (el link /b/[id] es accesible por cualquiera)
CREATE POLICY "public read bills"        ON bills        FOR SELECT USING (true);
CREATE POLICY "public read items"        ON items        FOR SELECT USING (true);
CREATE POLICY "public read participants" ON participants  FOR SELECT USING (true);
CREATE POLICY "public read assignments"  ON assignments   FOR SELECT USING (true);

-- Escritura solo desde el servidor (service_role bypasses RLS, no necesita policy)
-- Las políticas INSERT/UPDATE/DELETE quedan sin definir para anon/authenticated.
-- El backend usa SUPABASE_SERVICE_ROLE_KEY que bypasea RLS automáticamente.
