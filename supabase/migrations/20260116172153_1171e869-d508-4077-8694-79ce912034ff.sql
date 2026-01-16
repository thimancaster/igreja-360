-- Add column to group installments together
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS installment_group_id UUID DEFAULT NULL;

-- Create index for efficient querying of installment groups
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group 
ON transactions(installment_group_id) 
WHERE installment_group_id IS NOT NULL;

-- Create function to update overdue transactions
CREATE OR REPLACE FUNCTION public.update_overdue_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE transactions
  SET status = 'Vencido', updated_at = NOW()
  WHERE status = 'Pendente'
    AND due_date < CURRENT_DATE;
END;
$$;

-- Create function to be called by cron job via edge function
CREATE OR REPLACE FUNCTION public.check_and_update_overdue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE transactions
  SET status = 'Vencido', updated_at = NOW()
  WHERE status = 'Pendente'
    AND due_date < CURRENT_DATE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', updated_count,
    'executed_at', NOW()
  );
END;
$$;