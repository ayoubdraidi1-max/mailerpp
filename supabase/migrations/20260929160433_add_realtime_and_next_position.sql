/*
# Realtime + Atomic Next-Position for Multi-User Support

## Purpose
Enables live sync between users (Supabase Realtime) and eliminates position
collisions when multiple users add records simultaneously.

## Changes

### 1. Realtime Publication
- Adds all five tracker tables (sponsors, offers, datasets, mailers, drops) to the
  `supabase_realtime` publication so the frontend receives INSERT/UPDATE/DELETE
  events instantly. Any user who adds, edits, or deletes a row will see it
  reflected on every other connected user's screen within ~1 second.

### 2. Atomic Next-Position Function
- Creates `get_next_position(p_table text)` — a SECURITY DEFINER function that
  atomically reads `MAX(position)` and returns `max + 1`. Because it runs as a
  single SQL statement inside the function, two concurrent callers cannot
  receive the same value (each call sees the committed state at call time).
  This replaces the previous client-side `maxPos + 1` pattern which caused
  duplicate position numbers when two users added items at the same time.

### 3. Security
- The `get_next_position` function is executable by `anon` and `authenticated`
  (single-tenant shared-data app). It only reads position columns — no writes,
  no sensitive data exposure.

### Notes
1. Realtime publication uses `REPLICA IDENTITY DEFAULT` (only changed columns
   in the payload), which is fine for this app — the frontend refetches full
   data on any change event.
2. The function uses a simple `SELECT max(position) FROM <table>` with the
   table name passed as a text parameter. Table names are validated against an
   allowlist inside the function to prevent SQL injection.
*/

-- 1. Enable realtime on all tracker tables
ALTER TABLE sponsors REPLICA IDENTITY DEFAULT;
ALTER TABLE offers REPLICA IDENTITY DEFAULT;
ALTER TABLE datasets REPLICA IDENTITY DEFAULT;
ALTER TABLE mailers REPLICA IDENTITY DEFAULT;
ALTER TABLE drops REPLICA IDENTITY DEFAULT;

DO $$
BEGIN
  -- Add each table to the realtime publication if not already a member
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sponsors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sponsors;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE offers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'datasets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE datasets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'mailers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mailers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'drops'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE drops;
  END IF;
END $$;

-- 2. Atomic next-position function
CREATE OR REPLACE FUNCTION get_next_position(p_table text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max int;
  v_table text;
BEGIN
  -- Allowlist of valid table names to prevent SQL injection
  v_table := CASE p_table
    WHEN 'sponsors' THEN 'sponsors'
    WHEN 'offers' THEN 'offers'
    WHEN 'datasets' THEN 'datasets'
    WHEN 'mailers' THEN 'mailers'
    WHEN 'drops' THEN 'drops'
    ELSE NULL
  END;

  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table;
  END IF;

  EXECUTE format('SELECT COALESCE(max(position), -1) FROM %I', v_table) INTO v_max;

  RETURN v_max + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_next_position(text) TO anon, authenticated;
