-- Add RLS policy for church owners to update their own church
CREATE POLICY "Owners can update their own church" 
ON public.churches 
FOR UPDATE 
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);