
-- Fix linter: move pg_net extension out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      ALTER EXTENSION pg_net SET SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
      -- If extension is not relocatable, do nothing; we will rely on existing setup.
      RAISE NOTICE 'Could not move pg_net extension: %', SQLERRM;
    END;
  END IF;
END$$;

-- Ensure expected usage permissions (required for crypto/http helpers)
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Harden storage policies for transfer letters to be church-scoped.
-- Path convention enforced by app: <church_id>/<user_id>/<member_id>/<filename>

-- Remove the policies created earlier (if present)
DROP POLICY IF EXISTS "Church members can upload transfer letters" ON storage.objects;
DROP POLICY IF EXISTS "Church members can view transfer letters" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete transfer letters" ON storage.objects;

-- INSERT: user can upload only under their church+user folder
CREATE POLICY "Transfer letters upload (church+user scoped)"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'transfer-letters'
  AND (storage.foldername(name))[1] = public.get_user_church_id(auth.uid())::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- SELECT: same church; owner can read; privileged roles can read
CREATE POLICY "Transfer letters read (church scoped)"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'transfer-letters'
  AND (storage.foldername(name))[1] = public.get_user_church_id(auth.uid())::text
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'pastor'::public.app_role)
    OR public.has_role(auth.uid(), 'tesoureiro'::public.app_role)
  )
);

-- DELETE: same church; admin/pastor only
CREATE POLICY "Transfer letters delete (admin/pastor)"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'transfer-letters'
  AND (storage.foldername(name))[1] = public.get_user_church_id(auth.uid())::text
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  )
);

-- UPDATE: same church; admin/pastor only (supports replacing files with upsert=false patterns)
CREATE POLICY "Transfer letters update (admin/pastor)"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'transfer-letters'
  AND (storage.foldername(name))[1] = public.get_user_church_id(auth.uid())::text
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'pastor'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'transfer-letters'
  AND (storage.foldername(name))[1] = public.get_user_church_id(auth.uid())::text
);
