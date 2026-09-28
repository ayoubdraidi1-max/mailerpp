/*
# Add admin_set_password function

Allows admin to set any password (including weak ones) by directly
updating the encrypted_password column in auth.users.
This bypasses Supabase's password strength validation.

1. New Functions
- admin_set_password(user_id uuid, new_password text) — sets password directly
*/

CREATE OR REPLACE FUNCTION public.admin_set_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;
