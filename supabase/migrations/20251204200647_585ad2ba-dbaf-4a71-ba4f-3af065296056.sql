-- Fix oauth_sessions.access_token to be nullable since we use encrypted tokens now
ALTER TABLE public.oauth_sessions ALTER COLUMN access_token DROP NOT NULL;

-- Set any existing values to NULL since we use encrypted columns now
UPDATE public.oauth_sessions SET access_token = NULL WHERE access_token IS NOT NULL;