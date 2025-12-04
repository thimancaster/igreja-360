-- Create private schema for secure storage
CREATE SCHEMA IF NOT EXISTS private;

-- Restrict access to private schema
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT ALL ON SCHEMA private TO service_role;

-- Create encryption key table in private schema
CREATE TABLE private.encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  key_value bytea NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Only service_role can access this table
REVOKE ALL ON private.encryption_keys FROM PUBLIC;
REVOKE ALL ON private.encryption_keys FROM authenticated;
GRANT ALL ON private.encryption_keys TO service_role;

-- Insert encryption key (generated randomly, stored securely)
INSERT INTO private.encryption_keys (key_name, key_value)
VALUES ('oauth_token_key', gen_random_bytes(32));

-- Create encrypt function (uses pgcrypto AES)
CREATE OR REPLACE FUNCTION private.encrypt_token(plaintext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  encryption_key bytea;
  encrypted_data bytea;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;
  
  SELECT key_value INTO encryption_key 
  FROM private.encryption_keys 
  WHERE key_name = 'oauth_token_key';
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;
  
  -- Encrypt using PGP symmetric encryption
  encrypted_data := pgp_sym_encrypt(plaintext, encode(encryption_key, 'base64'));
  
  RETURN encode(encrypted_data, 'base64');
END;
$$;

-- Create decrypt function
CREATE OR REPLACE FUNCTION private.decrypt_token(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  encryption_key bytea;
  decrypted_data text;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;
  
  SELECT key_value INTO encryption_key 
  FROM private.encryption_keys 
  WHERE key_name = 'oauth_token_key';
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;
  
  decrypted_data := pgp_sym_decrypt(decode(encrypted_text, 'base64'), encode(encryption_key, 'base64'));
  
  RETURN decrypted_data;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Add encrypted columns to google_integrations
ALTER TABLE public.google_integrations 
ADD COLUMN IF NOT EXISTS access_token_enc text,
ADD COLUMN IF NOT EXISTS refresh_token_enc text;

-- Add encrypted columns to oauth_sessions
ALTER TABLE public.oauth_sessions
ADD COLUMN IF NOT EXISTS access_token_enc text,
ADD COLUMN IF NOT EXISTS refresh_token_enc text;

-- Migrate existing tokens in google_integrations
UPDATE public.google_integrations
SET 
  access_token_enc = private.encrypt_token(access_token),
  refresh_token_enc = private.encrypt_token(refresh_token)
WHERE (access_token IS NOT NULL AND access_token != '') 
   OR (refresh_token IS NOT NULL AND refresh_token != '');

-- Migrate existing tokens in oauth_sessions
UPDATE public.oauth_sessions
SET 
  access_token_enc = private.encrypt_token(access_token),
  refresh_token_enc = private.encrypt_token(refresh_token)
WHERE (access_token IS NOT NULL AND access_token != '') 
   OR (refresh_token IS NOT NULL AND refresh_token != '');

-- Clear the original plaintext columns
UPDATE public.google_integrations SET access_token = NULL, refresh_token = NULL;
UPDATE public.oauth_sessions SET access_token = NULL, refresh_token = NULL;

-- Public function to get decrypted integration tokens (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_decrypted_integration(integration_id uuid)
RETURNS TABLE (
  access_token text,
  refresh_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    private.decrypt_token(gi.access_token_enc) as access_token,
    private.decrypt_token(gi.refresh_token_enc) as refresh_token
  FROM public.google_integrations gi
  WHERE gi.id = integration_id;
END;
$$;

-- Public function to get decrypted oauth session tokens
CREATE OR REPLACE FUNCTION public.get_decrypted_oauth_session(session_id uuid)
RETURNS TABLE (
  access_token text,
  refresh_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    private.decrypt_token(os.access_token_enc) as access_token,
    private.decrypt_token(os.refresh_token_enc) as refresh_token
  FROM public.oauth_sessions os
  WHERE os.id = session_id;
END;
$$;

-- Public function to store encrypted integration tokens
CREATE OR REPLACE FUNCTION public.store_encrypted_integration_tokens(
  p_integration_id uuid,
  p_access_token text,
  p_refresh_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  UPDATE public.google_integrations
  SET 
    access_token_enc = private.encrypt_token(p_access_token),
    refresh_token_enc = private.encrypt_token(p_refresh_token),
    updated_at = now()
  WHERE id = p_integration_id;
END;
$$;

-- Public function to store encrypted oauth session
CREATE OR REPLACE FUNCTION public.store_encrypted_oauth_session(
  p_user_id uuid,
  p_access_token text,
  p_refresh_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  new_session_id uuid;
BEGIN
  INSERT INTO public.oauth_sessions (user_id, access_token_enc, refresh_token_enc, access_token, refresh_token)
  VALUES (
    p_user_id, 
    private.encrypt_token(p_access_token), 
    private.encrypt_token(p_refresh_token),
    NULL,
    NULL
  )
  RETURNING id INTO new_session_id;
  
  RETURN new_session_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_decrypted_integration TO service_role;
GRANT EXECUTE ON FUNCTION public.get_decrypted_oauth_session TO service_role;
GRANT EXECUTE ON FUNCTION public.store_encrypted_integration_tokens TO service_role;
GRANT EXECUTE ON FUNCTION public.store_encrypted_oauth_session TO service_role;