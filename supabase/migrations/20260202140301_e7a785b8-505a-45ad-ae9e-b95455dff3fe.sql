-- =============================================
-- Sprint 2: Capacity Management & Staff Scheduling
-- =============================================

-- Table: classroom_settings
-- Stores capacity and configuration for each classroom
CREATE TABLE public.classroom_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  classroom_name VARCHAR NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 20,
  min_age_months INTEGER DEFAULT 0,
  max_age_months INTEGER DEFAULT 144,
  ratio_children_per_adult INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(church_id, classroom_name)
);

-- Enable RLS
ALTER TABLE public.classroom_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can manage classroom settings"
  ON public.classroom_settings FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'tesoureiro') OR
    has_role(auth.uid(), 'pastor') OR
    has_role(auth.uid(), 'lider')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'tesoureiro') OR
    has_role(auth.uid(), 'pastor') OR
    has_role(auth.uid(), 'lider')
  );

CREATE POLICY "Users can view classroom settings from their church"
  ON public.classroom_settings FOR SELECT
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

-- Table: waitlist
-- Tracks children waiting for spots in classrooms
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  classroom VARCHAR NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status VARCHAR NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'enrolled', 'expired', 'cancelled')),
  notes TEXT,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can manage waitlist"
  ON public.waitlist FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'tesoureiro') OR
    has_role(auth.uid(), 'pastor') OR
    has_role(auth.uid(), 'lider')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'tesoureiro') OR
    has_role(auth.uid(), 'pastor') OR
    has_role(auth.uid(), 'lider')
  );

CREATE POLICY "Parents can view their children waitlist entries"
  ON public.waitlist FOR SELECT
  USING (
    child_id IN (
      SELECT cg.child_id FROM child_guardians cg
      JOIN guardians g ON g.id = cg.guardian_id
      WHERE g.profile_id = auth.uid()
    )
  );

-- Table: ministry_staff
-- Stores volunteers/teachers information
CREATE TABLE public.ministry_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  role VARCHAR NOT NULL DEFAULT 'assistant' CHECK (role IN ('teacher', 'assistant', 'coordinator')),
  trained_classrooms TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  background_check_date DATE,
  certifications TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ministry_staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can manage ministry_staff"
  ON public.ministry_staff FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'tesoureiro') OR
    has_role(auth.uid(), 'pastor') OR
    has_role(auth.uid(), 'lider')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'tesoureiro') OR
    has_role(auth.uid(), 'pastor') OR
    has_role(auth.uid(), 'lider')
  );

CREATE POLICY "Users can view ministry staff from their church"
  ON public.ministry_staff FOR SELECT
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

-- Table: staff_schedules
-- Tracks volunteer schedules for events
CREATE TABLE public.staff_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.ministry_staff(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.ministry_events(id) ON DELETE CASCADE,
  classroom VARCHAR,
  shift_start TIMESTAMP WITH TIME ZONE NOT NULL,
  shift_end TIMESTAMP WITH TIME ZONE NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'backup')),
  confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can manage schedules"
  ON public.staff_schedules FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'tesoureiro') OR
    has_role(auth.uid(), 'pastor') OR
    has_role(auth.uid(), 'lider')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'tesoureiro') OR
    has_role(auth.uid(), 'pastor') OR
    has_role(auth.uid(), 'lider')
  );

CREATE POLICY "Users can view schedules from their church"
  ON public.staff_schedules FOR SELECT
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_classroom_settings_church ON public.classroom_settings(church_id);
CREATE INDEX idx_waitlist_church_status ON public.waitlist(church_id, status);
CREATE INDEX idx_waitlist_child ON public.waitlist(child_id);
CREATE INDEX idx_ministry_staff_church ON public.ministry_staff(church_id);
CREATE INDEX idx_ministry_staff_active ON public.ministry_staff(church_id, is_active);
CREATE INDEX idx_staff_schedules_church ON public.staff_schedules(church_id);
CREATE INDEX idx_staff_schedules_staff ON public.staff_schedules(staff_id);
CREATE INDEX idx_staff_schedules_event ON public.staff_schedules(event_id);
CREATE INDEX idx_staff_schedules_date ON public.staff_schedules(shift_start, shift_end);

-- Triggers for updated_at
CREATE TRIGGER update_classroom_settings_updated_at
  BEFORE UPDATE ON public.classroom_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ministry_staff_updated_at
  BEFORE UPDATE ON public.ministry_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_schedules_updated_at
  BEFORE UPDATE ON public.staff_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();