/*
# Add columns, rows, and cells for Google Sheets-like behavior

1. New Tables
- `sheet_columns`
  - `id` (uuid, primary key)
  - `sheet_id` (uuid, FK to sheets, ON DELETE CASCADE)
  - `name` (text, default "Column N") — column header label
  - `position` (int, default 0) — left-to-right ordering
  - `created_at` (timestamp)
- `sheet_rows`
  - `id` (uuid, primary key)
  - `sheet_id` (uuid, FK to sheets, ON DELETE CASCADE)
  - `position` (int, default 0) — top-to-bottom ordering
  - `color` (text, default null) — row-level color label
  - `created_at` (timestamp)
- `sheet_cells`
  - `id` (uuid, primary key)
  - `row_id` (uuid, FK to sheet_rows, ON DELETE CASCADE)
  - `column_id` (uuid, FK to sheet_columns, ON DELETE CASCADE)
  - `content` (text, default '') — the cell text
  - `created_at` (timestamp)
  - Unique constraint on (row_id, column_id)

2. Security
- RLS enabled on all three tables.
- Policies: TO anon, authenticated (shared/public data).
  - SELECT/INSERT/UPDATE/DELETE all open.

3. Notes
- The old `sheet_lines` table is kept for backward compatibility but no longer used by the UI.
- Each sheet gets a default "Column A" when created.
*/

CREATE TABLE IF NOT EXISTS sheet_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Column A',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sheet_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sheet_columns" ON sheet_columns;
CREATE POLICY "anon_select_sheet_columns" ON sheet_columns FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sheet_columns" ON sheet_columns;
CREATE POLICY "anon_insert_sheet_columns" ON sheet_columns FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sheet_columns" ON sheet_columns;
CREATE POLICY "anon_update_sheet_columns" ON sheet_columns FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sheet_columns" ON sheet_columns;
CREATE POLICY "anon_delete_sheet_columns" ON sheet_columns FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS sheet_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  color text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sheet_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sheet_rows" ON sheet_rows;
CREATE POLICY "anon_select_sheet_rows" ON sheet_rows FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sheet_rows" ON sheet_rows;
CREATE POLICY "anon_insert_sheet_rows" ON sheet_rows FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sheet_rows" ON sheet_rows;
CREATE POLICY "anon_update_sheet_rows" ON sheet_rows FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sheet_rows" ON sheet_rows;
CREATE POLICY "anon_delete_sheet_rows" ON sheet_rows FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS sheet_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES sheet_rows(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES sheet_columns(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(row_id, column_id)
);

ALTER TABLE sheet_cells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sheet_cells" ON sheet_cells;
CREATE POLICY "anon_select_sheet_cells" ON sheet_cells FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sheet_cells" ON sheet_cells;
CREATE POLICY "anon_insert_sheet_cells" ON sheet_cells FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sheet_cells" ON sheet_cells;
CREATE POLICY "anon_update_sheet_cells" ON sheet_cells FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sheet_cells" ON sheet_cells;
CREATE POLICY "anon_delete_sheet_cells" ON sheet_cells FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sheet_columns_sheet_id ON sheet_columns(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_rows_sheet_id ON sheet_rows(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_cells_row_id ON sheet_cells(row_id);
CREATE INDEX IF NOT EXISTS idx_sheet_cells_column_id ON sheet_cells(column_id);
