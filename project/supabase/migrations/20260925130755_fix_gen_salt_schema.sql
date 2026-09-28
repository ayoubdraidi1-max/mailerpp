/*
# Fix gen_salt schema path in admin_set_password

pgcrypto is installed in the 'extensions' schema, so gen_salt and crypt
need to be referenced with the schema prefix.
*/

CREATE OR REPLACE FUNCTION public.admin_set_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied: admin only';
    END IF;
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;
