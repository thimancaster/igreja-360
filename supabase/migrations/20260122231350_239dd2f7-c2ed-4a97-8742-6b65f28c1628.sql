-- Fix 1: Secure invoices storage bucket with RLS policies
-- Ensure bucket is private and has proper constraints
UPDATE storage.buckets 
SET public = false, 
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'invoices';

-- Create RLS policies for invoices bucket
-- Users can only upload to their own folder
CREATE POLICY "Users can upload invoices to their folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own uploads OR invoices from transactions in their church
CREATE POLICY "Users can view church invoices"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE t.invoice_url LIKE '%' || name
      AND t.church_id = p.church_id
    )
  )
);

-- Users can update their own uploads
CREATE POLICY "Users can update own invoices"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own invoices"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = auth.uid()::text
);