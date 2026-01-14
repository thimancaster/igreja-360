-- Add external_id column for intelligent sync tracking
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Create index for fast lookups on external_id
CREATE INDEX IF NOT EXISTS idx_transactions_external_id 
ON public.transactions(external_id) 
WHERE external_id IS NOT NULL;

-- Create composite index for church_id + origin + external_id
CREATE INDEX IF NOT EXISTS idx_transactions_church_origin_external 
ON public.transactions(church_id, origin, external_id) 
WHERE external_id IS NOT NULL;