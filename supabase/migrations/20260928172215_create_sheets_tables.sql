/*
# Create sheets and sheet_lines tables

1. New Tables
- `sheets`
  - `id` (uuid, primary key)
  - `name` (text, not null) — the sheet page name
  - `position` (int, default 0) — ordering for scrolling between sheets
  - `created_at` (timestamp)
- `sheet_lines`
  - `id` (uuid, primary key)
  - `sheet_id` (uuid, foreign key to sheets, ON DELETE CASCADE)
  - `content` (text, not null) — the text/link on that line
  - `color` (text, default null) — a color label for the line (e.g. "red", "green", etc.)
  - `position` (int, default 0) — line ordering within the sheet
  - `created_at` (timestamp)

2. Security
- Enable RLS on both tables.
- Policies: TO anon, authenticated (shared/public data, no sign-in required for this feature).
  - SELECT: anyone can read
  - INSERT: anyone can insert
  - UPDATE: anyone can update
  - DELETE: anyone can delete
*/

CREATE TABLE IF NOT EXISTS sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sheets" ON sheets;
CREATE POLICY "anon_select_sheets" ON sheets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sheets" ON sheets;
CREATE POLICY "anon_insert_sheets" ON sheets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sheets" ON sheets;
CREATE POLICY "anon_update_sheets" ON sheets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sheets" ON sheets;
CREATE POLICY "anon_delete_sheets" ON sheets FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS sheet_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  color text DEFAULT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sheet_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sheet_lines" ON sheet_lines;
CREATE POLICY "anon_select_sheet_lines" ON sheet_lines FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sheet_lines" ON sheet_lines;
CREATE POLICY "anon_insert_sheet_lines" ON sheet_lines FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sheet_lines" ON sheet_lines;
CREATE POLICY "anon_update_sheet_lines" ON sheet_lines FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sheet_lines" ON sheet_lines;
CREATE POLICY "anon_delete_sheet_lines" ON sheet_lines FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sheet_lines_sheet_id ON sheet_lines(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_lines_position ON sheet_lines(position);
