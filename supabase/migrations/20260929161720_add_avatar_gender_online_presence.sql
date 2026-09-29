/*
# Add avatar, gender, and online presence to profiles

## Purpose
Supports profile pictures (avatar URL), gender selection (male/female), and
real-time online presence tracking (like Google Sheets collaborator avatars).

## Changes to `profiles` table
1. `avatar_url` (text, nullable) — URL to the user's profile picture. Defaults
   to NULL; the frontend generates an unknown-person avatar placeholder when null.
2. `gender` (text, nullable) — 'male' or 'female'. Required at user creation.
3. `is_online` (boolean, default false) — flipped by the frontend heartbeat.
4. `last_seen` (timestamptz, default now()) — updated whenever the user's
   heartbeat fires; used to detect stale online status.

## Realtime
- Adds `profiles` to the `supabase_realtime` publication so all connected users
  see presence changes (someone joins/leaves) instantly.

## Security
- RLS: adds a SELECT policy so any authenticated user can read other users'
  presence/avatar/gender (needed for the collaborator avatars bar). The existing
  update_own_profile policy covers heartbeat updates (user only updates their own row).
- No new INSERT/DELETE policies needed — profiles are created by the edge function
  (service role) and deleted via cascade from auth.users.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();

-- Allow all authenticated users to read profiles (for presence/avatars)
DROP POLICY IF EXISTS "read_all_profiles" ON profiles;
CREATE POLICY "read_all_profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Enable realtime on profiles
ALTER TABLE profiles REPLICA IDENTITY DEFAULT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
END $$;
