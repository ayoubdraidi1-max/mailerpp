/*
# Fix admin_set_password for service-role calls

The edge function calls admin_set_password via the service role key,
where auth.uid() is null. The edge function already performs its own
admin check, so the SQL function should not re-check via auth.uid().

1. Modified Functions
- admin_set_password — now uses a SECURITY DEFINER function that checks
  is_admin() only when auth.uid() is not null (i.e. called by a real user).
  When called via the service role (auth.uid() is null), it allows the
  operation since the edge function already verified admin access.
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
  -- Only check is_admin() when there's an authenticated user context.
  -- The service role (used by edge functions) has auth.uid() = null,
  -- and the edge function already performed its own admin check.
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied: admin only';
    END IF;
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;
