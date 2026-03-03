
-- 1. Extend ministry_events to be the central church events table
ALTER TABLE public.ministry_events 
  ADD COLUMN IF NOT EXISTS ticket_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paid_event boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS visibility varchar NOT NULL DEFAULT 'members',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Add event_id to child_check_ins for linking
ALTER TABLE public.child_check_ins
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.ministry_events(id) ON DELETE SET NULL;

-- 3. Alter event_registrations to support all members (not just children)
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status varchar NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS payment_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_date timestamptz,
  ADD COLUMN IF NOT EXISTS check_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS check_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS ticket_number varchar,
  ADD COLUMN IF NOT EXISTS church_id uuid REFERENCES public.churches(id) ON DELETE CASCADE;

-- Make child_id and guardian_id nullable (they were required before)
ALTER TABLE public.event_registrations
  ALTER COLUMN child_id DROP NOT NULL,
  ALTER COLUMN guardian_id DROP NOT NULL;

-- 4. Create event_attendance table for detailed metrics
CREATE TABLE IF NOT EXISTS public.event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.ministry_events(id) ON DELETE CASCADE,
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  check_in_at timestamptz NOT NULL DEFAULT now(),
  check_out_at timestamptz,
  checked_in_by uuid,
  method varchar NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- RLS for event_attendance
CREATE POLICY "Staff can manage event attendance"
  ON public.event_attendance FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'tesoureiro'::app_role) OR 
    has_role(auth.uid(), 'pastor'::app_role) OR 
    has_role(auth.uid(), 'lider'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'tesoureiro'::app_role) OR 
    has_role(auth.uid(), 'pastor'::app_role) OR 
    has_role(auth.uid(), 'lider'::app_role)
  );

CREATE POLICY "Members can view attendance from their church"
  ON public.event_attendance FOR SELECT
  USING (church_id = get_user_church_id(auth.uid()));

-- RLS for event_registrations - add policy for members to register themselves
CREATE POLICY "Members can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (
    profile_id = auth.uid() AND
    church_id = get_user_church_id(auth.uid())
  );

CREATE POLICY "Members can view own registrations"
  ON public.event_registrations FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Members can cancel own registrations"
  ON public.event_registrations FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Add SELECT policy for ministry_events for all authenticated church members
CREATE POLICY "Members can view published events from their church"
  ON public.ministry_events FOR SELECT
  USING (
    church_id = get_user_church_id(auth.uid()) AND status = 'published'
  );

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_ministry_events_church_date ON public.ministry_events(church_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_profile ON public.event_registrations(profile_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON public.event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_child_check_ins_event ON public.child_check_ins(event_id);
