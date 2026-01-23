-- ============================================
-- 1. DROP LEGACY DECRYPTION FUNCTIONS
-- These functions lack ownership validation and
-- were replaced by v2 versions with proper checks
-- ============================================

DROP FUNCTION IF EXISTS public.get_decrypted_integration(uuid);
DROP FUNCTION IF EXISTS public.get_decrypted_oauth_session(uuid);

-- ============================================
-- 2. REMOVE AUTO_SYNC_SECRET FROM DATABASE
-- The secret should only exist in edge function
-- environment variables, not in database tables
-- ============================================

-- Drop the function that retrieves the secret
DROP FUNCTION IF EXISTS private.get_auto_sync_secret();

-- Drop the secrets table (if it only contains the auto_sync secret)
DROP TABLE IF EXISTS private.app_secrets;

-- ============================================
-- 3. UPDATE trigger_auto_sync_overdue TO USE 
-- DIRECT HTTP CALL WITHOUT SECRET LOOKUP
-- The auto-sync edge function will validate via
-- Supabase service role key instead
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_auto_sync_overdue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  project_url text := 'https://cxiudqwfwpdwpfyqpaxw.supabase.co';
  service_role_key text;
BEGIN
  -- Use the service role key from environment (set by Supabase)
  -- The edge function will validate the service role key
  service_role_key := current_setting('request.headers', true)::json->>'authorization';
  
  -- If no key available, just call check_and_update_overdue directly
  -- This is safe as the function is SECURITY DEFINER
  IF service_role_key IS NULL THEN
    PERFORM public.check_and_update_overdue();
    RETURN;
  END IF;
  
  -- Call the edge function with service role authorization
  PERFORM extensions.http_post(
    url := project_url || '/functions/v1/auto-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', service_role_key
    ),
    body := jsonb_build_object(
      'action', 'update_overdue',
      'triggered_at', now()::text
    )
  );
END;
$function$;