
-- Allow users to create their own guardian record (auto-creation from portal)
CREATE POLICY "Users can create their own guardian record"
ON public.guardians
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Allow parents to view their own guardian record
CREATE POLICY "Parents can view own guardian record"
ON public.guardians
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());
