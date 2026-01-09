-- Add installment columns to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_installments INTEGER DEFAULT 1;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name VARCHAR,
  action VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_count INTEGER DEFAULT 0,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs from their church
CREATE POLICY "Admins can view audit logs from their church"
ON public.audit_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') 
  AND church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
);

-- Allow inserting audit logs (for authenticated users logging their own actions)
CREATE POLICY "Users can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);