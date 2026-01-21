-- Create a wrapper function that calls the auto-sync edge function with authentication
-- This function retrieves the secret from vault and uses pg_net to make the HTTP call

CREATE OR REPLACE FUNCTION public.trigger_auto_sync_overdue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions'
AS $$
DECLARE
  secret_key text;
  project_url text := 'https://cxiudqwfwpdwpfyqpaxw.supabase.co';
BEGIN
  -- Get the secret from vault
  secret_key := private.get_auto_sync_secret();
  
  IF secret_key IS NULL THEN
    RAISE WARNING 'AUTO_SYNC_SECRET_KEY not found in vault';
    RETURN;
  END IF;
  
  -- Call the edge function with proper authorization
  PERFORM extensions.http_post(
    url := project_url || '/functions/v1/auto-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret_key
    ),
    body := jsonb_build_object(
      'action', 'update_overdue',
      'triggered_at', now()::text
    )
  );
END;
$$;

-- Restrict access to this function
REVOKE ALL ON FUNCTION public.trigger_auto_sync_overdue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trigger_auto_sync_overdue() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_auto_sync_overdue() TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_auto_sync_overdue() TO service_role;

-- Schedule the cron job to call this function daily at 00:01
SELECT cron.schedule(
  'update-overdue-transactions-daily',
  '1 0 * * *',
  $$SELECT public.trigger_auto_sync_overdue()$$
);