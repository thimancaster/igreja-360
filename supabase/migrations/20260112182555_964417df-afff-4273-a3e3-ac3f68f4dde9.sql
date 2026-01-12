-- Create table for public Google Sheets integrations (no OAuth required)
CREATE TABLE public.public_sheet_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sheet_url text NOT NULL,
  sheet_id text NOT NULL,
  sheet_name text NOT NULL DEFAULT 'Planilha Pública',
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamp with time zone,
  sync_status text DEFAULT 'pending',
  records_synced integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.public_sheet_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own public sheet integrations"
ON public.public_sheet_integrations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own public sheet integrations"
ON public.public_sheet_integrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own public sheet integrations"
ON public.public_sheet_integrations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own public sheet integrations"
ON public.public_sheet_integrations
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_public_sheet_integrations_updated_at
BEFORE UPDATE ON public.public_sheet_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_public_sheet_integrations_church_id ON public.public_sheet_integrations(church_id);
CREATE INDEX idx_public_sheet_integrations_user_id ON public.public_sheet_integrations(user_id);