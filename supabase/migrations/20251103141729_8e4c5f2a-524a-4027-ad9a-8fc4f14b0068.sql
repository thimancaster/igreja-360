-- Add owner_user_id column to churches table
ALTER TABLE public.churches 
ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_churches_owner_user_id ON public.churches(owner_user_id);

-- Add RLS policy to allow users to create their own church
CREATE POLICY "Users can create their own church" 
ON public.churches 
FOR INSERT 
WITH CHECK (auth.uid() = owner_user_id);

-- Add status column for church status tracking
ALTER TABLE public.churches 
ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'active';

-- Update existing churches to set owner from profile associations
UPDATE public.churches c
SET owner_user_id = p.id
FROM public.profiles p
WHERE p.church_id = c.id
AND c.owner_user_id IS NULL;