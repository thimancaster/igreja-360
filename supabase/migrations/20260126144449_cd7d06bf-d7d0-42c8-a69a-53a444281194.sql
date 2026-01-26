-- Switch token decryption RPCs from SECURITY DEFINER to SECURITY INVOKER.
-- These RPCs are already EXECUTE-restricted to service_role; using INVOKER removes the definer bypass class entirely.

CREATE OR REPLACE FUNCTION public.get_decrypted_integration_v2(integration_id uuid, requesting_user_id uuid)
RETURNS TABLE(access_token text, refresh_token text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  -- Defense-in-depth: even though EXECUTE is restricted, ensure invocations come from service role.
  IF session_user <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

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

CREATE OR REPLACE FUNCTION public.get_decrypted_oauth_session_v2(session_id uuid, requesting_user_id uuid)
RETURNS TABLE(access_token text, refresh_token text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  -- Defense-in-depth: even though EXECUTE is restricted, ensure invocations come from service role.
  IF session_user <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

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

-- Ensure no public/client execute privileges exist (service_role can still execute).
REVOKE EXECUTE ON FUNCTION public.get_decrypted_integration_v2(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_decrypted_oauth_session_v2(uuid, uuid) FROM anon, authenticated;

-- Explicitly grant to service_role for clarity.
GRANT EXECUTE ON FUNCTION public.get_decrypted_integration_v2(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_decrypted_oauth_session_v2(uuid, uuid) TO service_role;
