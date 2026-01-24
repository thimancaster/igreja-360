-- Fix: Remove lider role from broad guardian access policy
-- Liders should not have unrestricted access to all guardian PII (email, phone, access_pin)
-- Admin, tesoureiro, and pastor roles retain full access

DROP POLICY IF EXISTS "Staff can manage guardians" ON public.guardians;

-- Recreate policy without lider role
CREATE POLICY "Staff can manage guardians"
ON public.guardians
FOR ALL
TO authenticated
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

-- Note: Users with lider role can still view their own guardian profile 
-- via the existing "Users can view their own guardian profile" policy
-- if they have a profile_id linked to their auth.uid()