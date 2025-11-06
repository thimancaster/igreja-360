-- Create table for temporary OAuth sessions
CREATE TABLE IF NOT EXISTS public.oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Enable RLS
ALTER TABLE public.oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own sessions
CREATE POLICY "Users can read own oauth sessions"
ON public.oauth_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role can insert sessions (for edge function)
CREATE POLICY "Service role can insert oauth sessions"
ON public.oauth_sessions
FOR INSERT
WITH CHECK (true);

-- Policy: Users can delete their own sessions after use
CREATE POLICY "Users can delete own oauth sessions"
ON public.oauth_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookup
CREATE INDEX idx_oauth_sessions_user_expires ON public.oauth_sessions(user_id, expires_at);

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.oauth_sessions
  WHERE expires_at < NOW();
END;
$$;