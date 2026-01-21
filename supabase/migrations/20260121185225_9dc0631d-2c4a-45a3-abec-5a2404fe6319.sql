-- Enable vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Store the AUTO_SYNC_SECRET_KEY in vault
-- Note: The actual value will be inserted separately via supabase--insert
-- First, let's create a helper function to get the secret from vault

CREATE OR REPLACE FUNCTION private.get_auto_sync_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'vault', 'private'
AS $$
DECLARE
  secret_value text;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = 'auto_sync_secret_key'
  LIMIT 1;
  
  RETURN secret_value;
END;
$$;

-- Revoke public access to the function
REVOKE ALL ON FUNCTION private.get_auto_sync_secret() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_auto_sync_secret() FROM authenticated;

-- Only postgres (cron context) and service_role can use it
GRANT EXECUTE ON FUNCTION private.get_auto_sync_secret() TO postgres;
GRANT EXECUTE ON FUNCTION private.get_auto_sync_secret() TO service_role;