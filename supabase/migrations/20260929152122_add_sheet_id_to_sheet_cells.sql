-- Add sheet_id to sheet_cells for efficient querying (avoids .in() URL length limits)
ALTER TABLE sheet_cells ADD COLUMN sheet_id uuid;

-- Backfill existing cells
UPDATE sheet_cells sc
SET sheet_id = sr.sheet_id
FROM sheet_rows sr
WHERE sc.row_id = sr.id;

-- Make it NOT NULL now that all rows are backfilled
ALTER TABLE sheet_cells ALTER COLUMN sheet_id SET NOT NULL;

-- Index for fast lookup by sheet
CREATE INDEX IF NOT EXISTS idx_sheet_cells_sheet_id ON sheet_cells(sheet_id);
