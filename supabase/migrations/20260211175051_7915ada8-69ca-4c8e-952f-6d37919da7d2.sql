
-- Add transfer and ecclesiastical columns to members table
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS marital_status VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS profession VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spouse_name VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spouse_attends_church VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS children_names TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS baptism_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS baptism_church VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS baptism_pastor VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS holy_spirit_baptism VARCHAR DEFAULT 'no',
  ADD COLUMN IF NOT EXISTS previous_church VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS previous_church_duration VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS previous_denominations TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS time_without_church VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS previous_ministry TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS previous_ministry_roles TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS technical_skills TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS departure_conversation BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS departure_details TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS departure_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_transfer_letter BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS transfer_letter_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admission_type VARCHAR DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS wants_pastoral_visit BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS leadership_notes TEXT DEFAULT NULL;

-- Create storage bucket for transfer letters
INSERT INTO storage.buckets (id, name, public)
VALUES ('transfer-letters', 'transfer-letters', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Members of the church can upload
CREATE POLICY "Church members can upload transfer letters"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'transfer-letters'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Church members can view their church's files
CREATE POLICY "Church members can view transfer letters"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transfer-letters'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'pastor', 'tesoureiro'))
      )
    )
  )
);

-- RLS: Admin/pastor can delete
CREATE POLICY "Admins can delete transfer letters"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'transfer-letters'
  AND EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'pastor')
  )
);
