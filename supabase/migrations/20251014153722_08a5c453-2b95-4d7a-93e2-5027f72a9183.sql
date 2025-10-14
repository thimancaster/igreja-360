-- Create google_integrations table
CREATE TABLE public.google_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sheet_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  column_mapping JSONB NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own integrations
CREATE POLICY "Users can manage their own integrations"
ON public.google_integrations
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_google_integrations_updated_at
BEFORE UPDATE ON public.google_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();