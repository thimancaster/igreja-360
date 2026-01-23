-- Harden OAuth token decryption functions with explicit ownership checks

-- 1) Create v2 functions that require the requesting user id and validate ownership
CREATE OR REPLACE FUNCTION public.get_decrypted_integration_v2(
  integration_id uuid,
  requesting_user_id uuid
)
RETURNS TABLE(access_token text, refresh_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'requesting_user_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.google_integrations gi
    WHERE gi.id = integration_id
      AND gi.user_id = requesting_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    private.decrypt_token(gi.access_token_enc) AS access_token,
    private.decrypt_token(gi.refresh_token_enc) AS refresh_token
  FROM public.google_integrations gi
  WHERE gi.id = integration_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_decrypted_oauth_session_v2(
  session_id uuid,
  requesting_user_id uuid
)
RETURNS TABLE(access_token text, refresh_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'requesting_user_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.oauth_sessions os
    WHERE os.id = session_id
      AND os.user_id = requesting_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    private.decrypt_token(os.access_token_enc) AS access_token,
    private.decrypt_token(os.refresh_token_enc) AS refresh_token
  FROM public.oauth_sessions os
  WHERE os.id = session_id;
END;
$$;

-- 2) Lock down permissions: only service_role may execute v2 functions
REVOKE ALL ON FUNCTION public.get_decrypted_integration_v2(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_decrypted_oauth_session_v2(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_decrypted_integration_v2(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_decrypted_oauth_session_v2(uuid, uuid) TO service_role;

-- 3) Prevent accidental use of legacy functions (edge functions will be updated to v2)
REVOKE EXECUTE ON FUNCTION public.get_decrypted_integration(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_decrypted_oauth_session(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_decrypted_integration(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_decrypted_oauth_session(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_decrypted_integration(uuid) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.get_decrypted_oauth_session(uuid) FROM service_role;
