-- Fix warn-level finding by removing broad SELECT access to full guardians table
-- and replacing it with a narrowly-scoped, role-checked management RPC.

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;

-- 1) Create a restricted management RPC that returns ONLY the fields needed for staff management UI
--    (intentionally excludes access_pin).
CREATE OR REPLACE FUNCTION public.get_guardians_for_management()
RETURNS TABLE(
  id uuid,
  church_id uuid,
  profile_id uuid,
  full_name character varying,
  email character varying,
  phone character varying,
  photo_url text,
  relationship character varying,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id,
    g.church_id,
    g.profile_id,
    g.full_name,
    g.email,
    g.phone,
    g.photo_url,
    g.relationship,
    g.created_at,
    g.updated_at
  FROM public.guardians g
  WHERE
    g.church_id = public.get_user_church_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'tesoureiro'::public.app_role)
      OR public.has_role(auth.uid(), 'pastor'::public.app_role)
    )
  ORDER BY g.full_name;
$$;

REVOKE ALL ON FUNCTION public.get_guardians_for_management() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_guardians_for_management() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_guardians_for_management() TO authenticated;

-- 2) Remove broad staff SELECT access to the full guardians table
DROP POLICY IF EXISTS "Staff can view guardians for management" ON public.guardians;

-- 3) Tighten staff write access to their own church only
DROP POLICY IF EXISTS "Staff can insert guardians" ON public.guardians;
CREATE POLICY "Staff can insert guardians"
ON public.guardians
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'tesoureiro'::public.app_role)
    OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  )
  AND church_id = public.get_user_church_id(auth.uid())
);

DROP POLICY IF EXISTS "Staff can update guardians" ON public.guardians;
CREATE POLICY "Staff can update guardians"
ON public.guardians
FOR UPDATE
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'tesoureiro'::public.app_role)
    OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  )
  AND church_id = public.get_user_church_id(auth.uid())
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'tesoureiro'::public.app_role)
    OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  )
  AND church_id = public.get_user_church_id(auth.uid())
);

DROP POLICY IF EXISTS "Staff can delete guardians" ON public.guardians;
CREATE POLICY "Staff can delete guardians"
ON public.guardians
FOR DELETE
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'tesoureiro'::public.app_role)
    OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  )
  AND church_id = public.get_user_church_id(auth.uid())
);
