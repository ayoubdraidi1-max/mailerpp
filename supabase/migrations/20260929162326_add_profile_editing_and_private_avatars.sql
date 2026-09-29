/*
# Add editable profiles and private avatar uploads

## Purpose
Lets every signed-in user, including administrators, update their own display
name, upload a profile picture, and change their password without exposing
profile images through permanent external URLs.

## Profile changes
- Adds `display_name` (text, nullable) for the name shown in the application.
- Keeps `avatar_url` as a storage object path rather than an external URL.
- Limits authenticated users' direct profile updates to `display_name` and
  `avatar_url`; role, mailer assignment, presence, and audit-related fields are
  not client-writable.

## Storage changes
- Creates the private `profile-avatars` bucket.
- Limits uploads to JPEG, PNG, WebP, and GIF images up to 2 MB.
- Requires every object path to begin with the authenticated user's ID, so users
  cannot upload into another user's folder.
- Allows authenticated users to read profile avatars through storage policies;
  the frontend requests short-lived signed URLs for display.

## Security
- Profile reads remain available to authenticated users for collaborator names,
  avatars, and presence indicators.
- Profile updates remain restricted to the current user's own row.
- Sensitive profile fields cannot be changed through the browser's direct table
  update path.
- Password changes continue through Supabase Auth's authenticated password API.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name text;

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url) ON profiles TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "profile_avatar_insert_own_folder" ON storage.objects;
CREATE POLICY "profile_avatar_insert_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "profile_avatar_select_authenticated" ON storage.objects;
CREATE POLICY "profile_avatar_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "profile_avatar_update_own_folder" ON storage.objects;
CREATE POLICY "profile_avatar_update_own_folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "profile_avatar_delete_own_folder" ON storage.objects;
CREATE POLICY "profile_avatar_delete_own_folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
