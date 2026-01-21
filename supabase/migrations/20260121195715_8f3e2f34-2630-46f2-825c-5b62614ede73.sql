-- Create a private table to store the auto-sync secret
-- This is a secure alternative since vault.secrets has permission restrictions

CREATE TABLE IF NOT EXISTS private.app_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  secret_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Revoke all access from public and authenticated roles
REVOKE ALL ON private.app_secrets FROM PUBLIC;
REVOKE ALL ON private.app_secrets FROM authenticated;

-- Only postgres and service_role can access
GRANT ALL ON private.app_secrets TO postgres;
GRANT ALL ON private.app_secrets TO service_role;

-- Update the helper function to read from our private table instead of vault
CREATE OR REPLACE FUNCTION private.get_auto_sync_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'private'
AS $$
DECLARE
  secret_value text;
BEGIN
  SELECT s.secret_value INTO secret_value
  FROM private.app_secrets s
  WHERE s.name = 'auto_sync_secret_key'
  LIMIT 1;
  
  RETURN secret_value;
END;
$$;

-- Ensure proper access restrictions
REVOKE ALL ON FUNCTION private.get_auto_sync_secret() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_auto_sync_secret() FROM authenticated;
GRANT EXECUTE ON FUNCTION private.get_auto_sync_secret() TO postgres;
GRANT EXECUTE ON FUNCTION private.get_auto_sync_secret() TO service_role;