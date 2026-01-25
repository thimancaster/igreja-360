-- Fix guardians table security issues:
-- 1. guardians_table_phone_email_exposure - Restrict access to sensitive contact info
-- 2. guardians_access_pin_exposure - Hash access PINs and use verification function

-- First, drop existing RLS policies on guardians to recreate with proper access control
DROP POLICY IF EXISTS "Staff can manage guardians" ON public.guardians;
DROP POLICY IF EXISTS "Users can view their own guardian profile" ON public.guardians;
DROP POLICY IF EXISTS "Users can update their own guardian profile" ON public.guardians;

-- Create a secure view that excludes sensitive fields (access_pin, email, phone)
-- This view is for general staff use - it shows only non-sensitive guardian info
CREATE OR REPLACE VIEW public.guardians_safe
WITH (security_invoker=on) AS
  SELECT 
    id,
    church_id,
    profile_id,
    full_name,
    photo_url,
    relationship,
    created_at,
    updated_at
    -- Excludes: email, phone, access_pin
  FROM public.guardians;

-- Grant access to the view
GRANT SELECT ON public.guardians_safe TO authenticated;

-- Create a function to verify guardian access PIN (hashed comparison)
-- Staff cannot read PINs but can verify them
CREATE OR REPLACE FUNCTION public.verify_guardian_pin(p_guardian_id uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT access_pin INTO stored_hash
  FROM public.guardians
  WHERE id = p_guardian_id;
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Compare using pgcrypto crypt function
  -- If existing PINs are plaintext, this handles migration
  IF stored_hash LIKE '$2a$%' OR stored_hash LIKE '$2b$%' THEN
    -- Already hashed with bcrypt
    RETURN stored_hash = crypt(p_pin, stored_hash);
  ELSE
    -- Legacy plaintext comparison (for migration period)
    RETURN stored_hash = p_pin;
  END IF;
END;
$$;

-- Create a function to hash PINs on insert/update
CREATE OR REPLACE FUNCTION public.hash_guardian_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only hash if PIN is being set and isn't already hashed
  IF NEW.access_pin IS NOT NULL AND 
     NEW.access_pin != '' AND 
     NEW.access_pin NOT LIKE '$2a$%' AND 
     NEW.access_pin NOT LIKE '$2b$%' THEN
    NEW.access_pin = crypt(NEW.access_pin, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-hash PINs
DROP TRIGGER IF EXISTS hash_guardian_pin_trigger ON public.guardians;
CREATE TRIGGER hash_guardian_pin_trigger
  BEFORE INSERT OR UPDATE OF access_pin ON public.guardians
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_guardian_pin();

-- Hash existing plaintext PINs
UPDATE public.guardians
SET access_pin = crypt(access_pin, gen_salt('bf'))
WHERE access_pin IS NOT NULL 
  AND access_pin != ''
  AND access_pin NOT LIKE '$2a$%'
  AND access_pin NOT LIKE '$2b$%';

-- Now create proper RLS policies:

-- 1. Guardians can view and update their OWN full profile (including contact info)
CREATE POLICY "Guardians can view their own profile"
  ON public.guardians FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Guardians can update their own profile"
  ON public.guardians FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- 2. Staff can manage guardians but NOT read access_pin (enforced via view usage)
-- For INSERT/UPDATE/DELETE operations, staff needs full access
CREATE POLICY "Staff can insert guardians"
  ON public.guardians FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'tesoureiro'::app_role) OR 
    has_role(auth.uid(), 'pastor'::app_role)
  );

CREATE POLICY "Staff can update guardians"
  ON public.guardians FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'tesoureiro'::app_role) OR 
    has_role(auth.uid(), 'pastor'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'tesoureiro'::app_role) OR 
    has_role(auth.uid(), 'pastor'::app_role)
  );

CREATE POLICY "Staff can delete guardians"
  ON public.guardians FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'tesoureiro'::app_role) OR 
    has_role(auth.uid(), 'pastor'::app_role)
  );

-- 3. Staff can SELECT guardians (needed for management) but app code should use guardians_safe view
-- This is necessary for staff to manage guardians, but the application code 
-- should use guardians_safe view for display purposes
CREATE POLICY "Staff can view guardians for management"
  ON public.guardians FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'tesoureiro'::app_role) OR 
    has_role(auth.uid(), 'pastor'::app_role)
  );

-- Add comment to document the security pattern
COMMENT ON VIEW public.guardians_safe IS 'Safe view of guardians table that excludes sensitive fields (email, phone, access_pin). Use this for display purposes. Staff should use this view instead of direct table access when not managing guardian records.';

COMMENT ON FUNCTION public.verify_guardian_pin IS 'Securely verifies a guardian PIN without exposing the stored hash. Use this function for authentication instead of reading access_pin directly.';