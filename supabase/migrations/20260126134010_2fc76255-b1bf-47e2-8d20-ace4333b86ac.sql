-- Harden token decryption RPCs: restrict execution to service role invocations only
-- This reduces risk of token exfiltration and limits SECURITY DEFINER blast radius.

CREATE OR REPLACE FUNCTION public.get_decrypted_integration_v2(integration_id uuid, requesting_user_id uuid)
RETURNS TABLE(access_token text, refresh_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  -- Ensure this RPC cannot be executed from client contexts (PostgREST/authenticated).
  -- In SECURITY DEFINER functions, session_user reflects the caller role.
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
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  -- Ensure this RPC cannot be executed from client contexts (PostgREST/authenticated).
  -- In SECURITY DEFINER functions, session_user reflects the caller role.
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

-- Remove any accidental public/client execute privileges (service_role can still execute).
REVOKE EXECUTE ON FUNCTION public.get_decrypted_integration_v2(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_decrypted_oauth_session_v2(uuid, uuid) FROM anon, authenticated;

-- Explicitly grant to service_role (defense-in-depth / clarity)
GRANT EXECUTE ON FUNCTION public.get_decrypted_integration_v2(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_decrypted_oauth_session_v2(uuid, uuid) TO service_role;
