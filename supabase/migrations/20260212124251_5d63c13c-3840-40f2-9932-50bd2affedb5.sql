
-- Add children's ministry specific columns to department_volunteers
ALTER TABLE public.department_volunteers
  ADD COLUMN IF NOT EXISTS trained_classrooms text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS background_check_date date,
  ADD COLUMN IF NOT EXISTS certifications text;

-- Migrate existing ministry_staff data to department_volunteers
-- First check if there's a ministry named like 'infantil' and migrate
INSERT INTO public.department_volunteers (church_id, ministry_id, profile_id, full_name, email, phone, role, status, is_active, notes, trained_classrooms, background_check_date, certifications)
SELECT 
  ms.church_id,
  (SELECT m.id FROM ministries m WHERE m.church_id = ms.church_id AND LOWER(m.name) LIKE '%infant%' LIMIT 1),
  ms.profile_id,
  ms.full_name,
  ms.email,
  ms.phone,
  CASE ms.role 
    WHEN 'coordinator' THEN 'coordenador'
    ELSE 'membro'
  END,
  'active'::volunteer_status,
  COALESCE(ms.is_active, true),
  ms.notes,
  COALESCE(ms.trained_classrooms, '{}'),
  ms.background_check_date,
  ms.certifications
FROM ministry_staff ms
WHERE (SELECT m.id FROM ministries m WHERE m.church_id = ms.church_id AND LOWER(m.name) LIKE '%infant%' LIMIT 1) IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM department_volunteers dv 
  WHERE dv.full_name = ms.full_name 
    AND dv.church_id = ms.church_id
    AND dv.ministry_id = (SELECT m.id FROM ministries m WHERE m.church_id = ms.church_id AND LOWER(m.name) LIKE '%infant%' LIMIT 1)
);
