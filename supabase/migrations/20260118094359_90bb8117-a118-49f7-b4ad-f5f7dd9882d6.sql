-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert oauth sessions" ON public.oauth_sessions;

-- Create a more restrictive policy that validates user_id exists
-- This provides defense-in-depth: even if service role is compromised,
-- the inserted user_id must be a valid user in auth.users
CREATE POLICY "Service role can insert oauth sessions with valid user"
ON public.oauth_sessions
FOR INSERT
TO service_role
WITH CHECK (
  user_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = user_id)
);