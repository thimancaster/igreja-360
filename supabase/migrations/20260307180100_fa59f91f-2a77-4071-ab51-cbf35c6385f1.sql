
-- Allow parents (guardians with profile_id) to INSERT children into their church
CREATE POLICY "Parents can register children"
ON public.children
FOR INSERT
TO authenticated
WITH CHECK (
  church_id IN (
    SELECT g.church_id FROM guardians g WHERE g.profile_id = auth.uid()
  )
);

-- Allow parents to UPDATE their own children (linked via child_guardians)
CREATE POLICY "Parents can update their children"
ON public.children
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT cg.child_id
    FROM child_guardians cg
    JOIN guardians g ON g.id = cg.guardian_id
    WHERE g.profile_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT cg.child_id
    FROM child_guardians cg
    JOIN guardians g ON g.id = cg.guardian_id
    WHERE g.profile_id = auth.uid()
  )
);

-- Allow parents to INSERT child_guardians for their own guardian record
CREATE POLICY "Parents can link themselves to children"
ON public.child_guardians
FOR INSERT
TO authenticated
WITH CHECK (
  guardian_id IN (
    SELECT g.id FROM guardians g WHERE g.profile_id = auth.uid()
  )
);
