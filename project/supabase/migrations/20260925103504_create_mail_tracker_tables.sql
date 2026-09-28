/*
# Mail Distribution Tracker — Core Tables

Creates the four tables that power a web-based mail distribution tracker,
mirroring the Google Sheets workflow: Offers, Datasets, Mailers, and Drops.

1. New Tables
- `offers` — marketing offers, each tagged with a region code (FR, UK, etc.)
  - id (uuid PK), name (text), region (text), created_at, position (int for ordering)
- `datasets` — data lists available for distribution, each with a total count and region
  - id (uuid PK), name (text), total (bigint), region (text), created_at, position (int)
- `mailers` — people who handle drops
  - id (uuid PK), name (text), created_at, position (int)
- `drops` — assignment rows: a mailer is assigned a slice (offset + limit) of a dataset for a given offer
  - id (uuid PK), offer_id (FK → offers), dataset_id (FK → datasets), mailer_id (FK → mailers),
    "offset" (bigint), "limit" (bigint), created_at, position (int)
  - "offset" and "limit" are quoted because they are PostgreSQL reserved keywords.

2. Relationships
- drops.offer_id → offers.id (CASCADE on delete)
- drops.dataset_id → datasets.id (CASCADE on delete)
- drops.mailer_id → mailers.id (CASCADE on delete)

3. Security
- Single-tenant app (no sign-in). RLS enabled on every table.
- All four CRUD verbs allowed for anon + authenticated on every table (data is intentionally shared).

4. Notes
- `position` columns (int default 0) let the UI reorder rows via drag or manual move.
- "offset" and "limit" are bigint to handle millions of records.
- Region is stored as text (ISO 3166-1 alpha-2 code) — validated in the UI dropdown.
*/

CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_offers" ON offers;
CREATE POLICY "anon_select_offers" ON offers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_offers" ON offers;
CREATE POLICY "anon_insert_offers" ON offers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_offers" ON offers;
CREATE POLICY "anon_update_offers" ON offers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_offers" ON offers;
CREATE POLICY "anon_delete_offers" ON offers FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  total bigint NOT NULL DEFAULT 0,
  region text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_datasets" ON datasets;
CREATE POLICY "anon_select_datasets" ON datasets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_datasets" ON datasets;
CREATE POLICY "anon_insert_datasets" ON datasets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_datasets" ON datasets;
CREATE POLICY "anon_update_datasets" ON datasets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_datasets" ON datasets;
CREATE POLICY "anon_delete_datasets" ON datasets FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS mailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mailers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mailers" ON mailers;
CREATE POLICY "anon_select_mailers" ON mailers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mailers" ON mailers;
CREATE POLICY "anon_insert_mailers" ON mailers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_mailers" ON mailers;
CREATE POLICY "anon_update_mailers" ON mailers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mailers" ON mailers;
CREATE POLICY "anon_delete_mailers" ON mailers FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES offers(id) ON DELETE CASCADE,
  dataset_id uuid REFERENCES datasets(id) ON DELETE CASCADE,
  mailer_id uuid REFERENCES mailers(id) ON DELETE CASCADE,
  "offset" bigint NOT NULL DEFAULT 0,
  "limit" bigint NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_drops" ON drops;
CREATE POLICY "anon_select_drops" ON drops FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_drops" ON drops;
CREATE POLICY "anon_insert_drops" ON drops FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_drops" ON drops;
CREATE POLICY "anon_update_drops" ON drops FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_drops" ON drops;
CREATE POLICY "anon_delete_drops" ON drops FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_drops_offer ON drops(offer_id);
CREATE INDEX IF NOT EXISTS idx_drops_dataset ON drops(dataset_id);
CREATE INDEX IF NOT EXISTS idx_drops_mailer ON drops(mailer_id);
CREATE INDEX IF NOT EXISTS idx_offers_region ON offers(region);
CREATE INDEX IF NOT EXISTS idx_datasets_region ON datasets(region);
