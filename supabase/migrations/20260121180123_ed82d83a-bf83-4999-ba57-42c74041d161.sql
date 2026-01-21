-- Fix: Revoke authenticated access to decryption functions (defense-in-depth)
-- These functions should only be called by Edge Functions using service_role

REVOKE EXECUTE ON FUNCTION public.get_decrypted_oauth_session(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_decrypted_integration(uuid) FROM authenticated;

-- Ensure service_role still has access (should already be granted by default)
GRANT EXECUTE ON FUNCTION public.get_decrypted_oauth_session(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_decrypted_integration(uuid) TO service_role;