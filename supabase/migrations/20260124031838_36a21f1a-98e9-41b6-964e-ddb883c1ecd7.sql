-- Fix 1: Add church membership validation to get_birthdays_this_month function
-- This prevents cross-church data access by validating caller belongs to the requested church

CREATE OR REPLACE FUNCTION public.get_birthdays_this_month(p_church_id UUID)
RETURNS TABLE (
  id UUID,
  full_name VARCHAR,
  birth_date DATE,
  phone VARCHAR,
  email VARCHAR,
  days_until INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller belongs to this church
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.church_id = p_church_id
  ) THEN
    RAISE EXCEPTION 'Access denied: not a member of this church';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.full_name,
    m.birth_date,
    m.phone,
    m.email,
    CASE 
      WHEN EXTRACT(DAY FROM m.birth_date) >= EXTRACT(DAY FROM CURRENT_DATE)
      THEN (EXTRACT(DAY FROM m.birth_date) - EXTRACT(DAY FROM CURRENT_DATE))::INTEGER
      ELSE (EXTRACT(DAY FROM m.birth_date) + 
            (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - DATE_TRUNC('month', CURRENT_DATE))::INTEGER / 86400 - 
            EXTRACT(DAY FROM CURRENT_DATE))::INTEGER
    END AS days_until
  FROM members m
  WHERE 
    m.church_id = p_church_id
    AND m.status = 'active'
    AND EXTRACT(MONTH FROM m.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  ORDER BY EXTRACT(DAY FROM m.birth_date);
END;
$$;

-- Fix 2: Replace permissive members SELECT policy with role-restricted policy
-- Only privileged roles (admin, tesoureiro, pastor, lider) can view full member details including PII

DROP POLICY IF EXISTS "Users can view members from their church" ON public.members;

CREATE POLICY "Privileged users can view members from their church"
ON public.members
FOR SELECT
USING (
  church_id IN (SELECT profiles.church_id FROM profiles WHERE profiles.id = auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'tesoureiro'::app_role) OR 
    has_role(auth.uid(), 'pastor'::app_role) OR
    has_role(auth.uid(), 'lider'::app_role)
  )
);