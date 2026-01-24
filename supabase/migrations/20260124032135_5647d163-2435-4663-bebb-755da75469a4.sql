-- Add church membership validation to generate_receipt_number function
-- This prevents users from generating receipt numbers for other churches

CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_church_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year TEXT;
  v_sequence INT;
  v_receipt TEXT;
BEGIN
  -- Verify caller belongs to this church
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.church_id = p_church_id
  ) THEN
    RAISE EXCEPTION 'Access denied: not a member of this church';
  END IF;

  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(receipt_number, '[^0-9]', '', 'g'), '')::INT
  ), 0) + 1
  INTO v_sequence
  FROM contributions
  WHERE church_id = p_church_id
    AND receipt_number LIKE v_year || '%';
  
  v_receipt := v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
  RETURN v_receipt;
END;
$function$;