-- =====================================================
-- Sprint 3: Health & Safety Tables
-- =====================================================

-- Table: medication_schedules - Track medication administration for children
CREATE TABLE public.medication_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL, -- e.g., "1x ao dia", "A cada 8 horas"
  administration_times TEXT[], -- e.g., ["08:00", "14:00", "20:00"]
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  instructions TEXT,
  requires_refrigeration BOOLEAN DEFAULT false,
  parent_authorization_date TIMESTAMP WITH TIME ZONE,
  authorized_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: medication_logs - Log each medication administration
CREATE TABLE public.medication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  administered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  administered_by UUID NOT NULL REFERENCES public.profiles(id),
  dosage_given VARCHAR(100) NOT NULL,
  notes TEXT,
  witnessed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: child_anamnesis - Medical history and health information
CREATE TABLE public.child_anamnesis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE UNIQUE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  -- Medical history
  blood_type VARCHAR(10),
  chronic_conditions TEXT,
  previous_surgeries TEXT,
  hospitalizations TEXT,
  -- Current health
  current_medications TEXT,
  vaccination_up_to_date BOOLEAN DEFAULT true,
  vaccination_notes TEXT,
  -- Restrictions
  dietary_restrictions TEXT,
  physical_restrictions TEXT,
  behavioral_notes TEXT,
  -- Emergency
  pediatrician_name VARCHAR(255),
  pediatrician_phone VARCHAR(50),
  health_insurance VARCHAR(255),
  health_insurance_number VARCHAR(100),
  -- Consent
  photo_consent BOOLEAN DEFAULT false,
  medical_treatment_consent BOOLEAN DEFAULT false,
  emergency_transport_consent BOOLEAN DEFAULT false,
  consent_signed_by UUID REFERENCES public.profiles(id),
  consent_signed_at TIMESTAMP WITH TIME ZONE,
  -- Metadata
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: incident_reports - Document any incidents involving children
CREATE TABLE public.incident_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  check_in_id UUID REFERENCES public.child_check_ins(id),
  -- Incident details
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_time TIME NOT NULL DEFAULT CURRENT_TIME,
  location VARCHAR(255),
  incident_type VARCHAR(50) NOT NULL, -- 'injury', 'illness', 'behavioral', 'accident', 'other'
  severity VARCHAR(20) NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  description TEXT NOT NULL,
  -- Response
  immediate_action_taken TEXT,
  first_aid_administered BOOLEAN DEFAULT false,
  first_aid_details TEXT,
  medical_attention_required BOOLEAN DEFAULT false,
  medical_attention_details TEXT,
  -- Witnesses
  witnesses TEXT[],
  staff_present TEXT[],
  -- Parent notification
  parent_notified_at TIMESTAMP WITH TIME ZONE,
  parent_notified_by UUID REFERENCES public.profiles(id),
  parent_response TEXT,
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  follow_up_completed_at TIMESTAMP WITH TIME ZONE,
  -- Metadata
  reported_by UUID NOT NULL REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_review', 'resolved', 'closed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- Row Level Security Policies
-- =====================================================

ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Medication Schedules policies
CREATE POLICY "Staff can manage medication schedules"
ON public.medication_schedules FOR ALL
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

CREATE POLICY "Parents can view their children medication schedules"
ON public.medication_schedules FOR SELECT
USING (
  child_id IN (
    SELECT cg.child_id FROM child_guardians cg
    JOIN guardians g ON g.id = cg.guardian_id
    WHERE g.profile_id = auth.uid()
  )
);

-- Medication Logs policies
CREATE POLICY "Staff can manage medication logs"
ON public.medication_logs FOR ALL
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

CREATE POLICY "Parents can view their children medication logs"
ON public.medication_logs FOR SELECT
USING (
  child_id IN (
    SELECT cg.child_id FROM child_guardians cg
    JOIN guardians g ON g.id = cg.guardian_id
    WHERE g.profile_id = auth.uid()
  )
);

-- Child Anamnesis policies
CREATE POLICY "Staff can manage anamnesis"
ON public.child_anamnesis FOR ALL
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

CREATE POLICY "Parents can view their children anamnesis"
ON public.child_anamnesis FOR SELECT
USING (
  child_id IN (
    SELECT cg.child_id FROM child_guardians cg
    JOIN guardians g ON g.id = cg.guardian_id
    WHERE g.profile_id = auth.uid()
  )
);

-- Incident Reports policies
CREATE POLICY "Staff can manage incident reports"
ON public.incident_reports FOR ALL
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

CREATE POLICY "Parents can view incident reports for their children"
ON public.incident_reports FOR SELECT
USING (
  child_id IN (
    SELECT cg.child_id FROM child_guardians cg
    JOIN guardians g ON g.id = cg.guardian_id
    WHERE g.profile_id = auth.uid()
  )
);

-- =====================================================
-- Indexes for performance
-- =====================================================

CREATE INDEX idx_medication_schedules_church_id ON public.medication_schedules(church_id);
CREATE INDEX idx_medication_schedules_child_id ON public.medication_schedules(child_id);
CREATE INDEX idx_medication_schedules_active ON public.medication_schedules(is_active) WHERE is_active = true;

CREATE INDEX idx_medication_logs_church_id ON public.medication_logs(church_id);
CREATE INDEX idx_medication_logs_child_id ON public.medication_logs(child_id);
CREATE INDEX idx_medication_logs_administered_at ON public.medication_logs(administered_at);

CREATE INDEX idx_child_anamnesis_church_id ON public.child_anamnesis(church_id);

CREATE INDEX idx_incident_reports_church_id ON public.incident_reports(church_id);
CREATE INDEX idx_incident_reports_child_id ON public.incident_reports(child_id);
CREATE INDEX idx_incident_reports_date ON public.incident_reports(incident_date);
CREATE INDEX idx_incident_reports_status ON public.incident_reports(status);

-- =====================================================
-- Triggers for updated_at
-- =====================================================

CREATE TRIGGER update_medication_schedules_updated_at
  BEFORE UPDATE ON public.medication_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_child_anamnesis_updated_at
  BEFORE UPDATE ON public.child_anamnesis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incident_reports_updated_at
  BEFORE UPDATE ON public.incident_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();