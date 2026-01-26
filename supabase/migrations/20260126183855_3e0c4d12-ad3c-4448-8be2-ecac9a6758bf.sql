-- Sprint 1: Communication and Calendar Tables

-- ===========================================
-- 1. ANNOUNCEMENTS TABLE
-- ===========================================
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  target_audience VARCHAR(30) NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'classroom', 'specific_children')),
  target_classrooms TEXT[] DEFAULT '{}',
  target_child_ids UUID[] DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Staff can manage announcements"
ON public.announcements
FOR ALL
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

CREATE POLICY "Parents can view published announcements for their children"
ON public.announcements
FOR SELECT
USING (
  published_at IS NOT NULL 
  AND published_at <= now()
  AND church_id IN (
    SELECT g.church_id FROM guardians g WHERE g.profile_id = auth.uid()
  )
  AND (
    target_audience = 'all'
    OR (
      target_audience = 'classroom' 
      AND EXISTS (
        SELECT 1 FROM children c
        JOIN child_guardians cg ON c.id = cg.child_id
        JOIN guardians g ON cg.guardian_id = g.id
        WHERE g.profile_id = auth.uid()
        AND c.classroom = ANY(target_classrooms)
      )
    )
    OR (
      target_audience = 'specific_children'
      AND EXISTS (
        SELECT 1 FROM child_guardians cg
        JOIN guardians g ON cg.guardian_id = g.id
        WHERE g.profile_id = auth.uid()
        AND cg.child_id = ANY(target_child_ids)
      )
    )
  )
);

-- ===========================================
-- 2. ANNOUNCEMENT READS TABLE
-- ===========================================
CREATE TABLE public.announcement_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcement_reads
CREATE POLICY "Users can manage their own reads"
ON public.announcement_reads
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can view all reads"
ON public.announcement_reads
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'tesoureiro'::app_role) OR 
  has_role(auth.uid(), 'pastor'::app_role) OR 
  has_role(auth.uid(), 'lider'::app_role)
);

-- ===========================================
-- 3. MINISTRY EVENTS TABLE
-- ===========================================
CREATE TABLE public.ministry_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(30) NOT NULL DEFAULT 'service' CHECK (event_type IN ('service', 'special', 'activity', 'meeting')),
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  location VARCHAR(255),
  recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  max_capacity INTEGER,
  registration_required BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ministry_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ministry_events
CREATE POLICY "Staff can manage events"
ON public.ministry_events
FOR ALL
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

CREATE POLICY "Parents can view events from their church"
ON public.ministry_events
FOR SELECT
USING (
  church_id IN (
    SELECT g.church_id FROM guardians g WHERE g.profile_id = auth.uid()
  )
);

-- ===========================================
-- 4. EVENT REGISTRATIONS TABLE
-- ===========================================
CREATE TABLE public.event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.ministry_events(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'waitlisted', 'cancelled')),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  UNIQUE(event_id, child_id)
);

-- Enable RLS
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_registrations
CREATE POLICY "Staff can manage all registrations"
ON public.event_registrations
FOR ALL
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

CREATE POLICY "Parents can manage their children's registrations"
ON public.event_registrations
FOR ALL
USING (
  guardian_id IN (SELECT id FROM guardians WHERE profile_id = auth.uid())
)
WITH CHECK (
  guardian_id IN (SELECT id FROM guardians WHERE profile_id = auth.uid())
);

-- ===========================================
-- 5. INDEXES
-- ===========================================
CREATE INDEX idx_announcements_church_id ON public.announcements(church_id);
CREATE INDEX idx_announcements_published_at ON public.announcements(published_at);
CREATE INDEX idx_announcement_reads_announcement_id ON public.announcement_reads(announcement_id);
CREATE INDEX idx_ministry_events_church_id ON public.ministry_events(church_id);
CREATE INDEX idx_ministry_events_start_datetime ON public.ministry_events(start_datetime);
CREATE INDEX idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX idx_event_registrations_child_id ON public.event_registrations(child_id);

-- ===========================================
-- 6. UPDATE TRIGGERS
-- ===========================================
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ministry_events_updated_at
BEFORE UPDATE ON public.ministry_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();