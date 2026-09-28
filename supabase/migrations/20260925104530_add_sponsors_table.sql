/*
# Add Sponsors table and link Offers to Sponsors

1. New Tables
- `sponsors` — organizations/people who own offers
  - id (uuid PK), name (text), region (text), position (int), created_at
  - Each sponsor has a region so offers inherit it automatically.

2. Modified Tables
- `offers` — add `sponsor_id` (uuid, FK → sponsors, ON DELETE SET NULL)
  - The offer's region now comes from its sponsor. The existing `region` column
    stays for backward compatibility and is kept in sync by the app.

3. Security
- RLS enabled on sponsors with anon + authenticated full CRUD (single-tenant, shared data).
- offers already has RLS; no policy changes needed since sponsor_id is just a new column.

4. Notes
- sponsor_id is nullable so existing offers without a sponsor are not lost.
- The app will set the offer's region from the selected sponsor's region on creation.
*/

CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sponsors" ON sponsors;
CREATE POLICY "anon_select_sponsors" ON sponsors FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sponsors" ON sponsors;
CREATE POLICY "anon_insert_sponsors" ON sponsors FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sponsors" ON sponsors;
CREATE POLICY "anon_update_sponsors" ON sponsors FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sponsors" ON sponsors;
CREATE POLICY "anon_delete_sponsors" ON sponsors FOR DELETE
  TO anon, authenticated USING (true);

ALTER TABLE offers ADD COLUMN IF NOT EXISTS sponsor_id uuid REFERENCES sponsors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offers_sponsor ON offers(sponsor_id);
