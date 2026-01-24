-- Tighten leader access to transactions and ensure leaders do not inherit the broad church-wide read policy

-- Replace leader policy with explicit ministry assignment validation
DROP POLICY IF EXISTS "Liders can only view their ministry transactions" ON public.transactions;

CREATE POLICY "Liders can only view their assigned ministry transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'lider'::app_role)
  AND ministry_id IS NOT NULL
  AND ministry_id IN (
    SELECT um.ministry_id
    FROM public.user_ministries um
    WHERE um.user_id = auth.uid()
  )
);

-- Recreate the church-wide read policy but exclude leaders, so leaders are governed by the leader policy above
DROP POLICY IF EXISTS "Users can view transactions from their church" ON public.transactions;

CREATE POLICY "Users can view transactions from their church"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  church_id IN (
    SELECT p.church_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
  AND NOT has_role(auth.uid(), 'lider'::app_role)
);
