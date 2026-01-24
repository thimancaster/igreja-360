
-- Add 'parent' role to the enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'parent' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'parent';
  END IF;
END$$;

-- Create children table
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  photo_url TEXT,
  classroom VARCHAR(100) NOT NULL DEFAULT 'Berçário',
  allergies TEXT,
  medications TEXT,
  special_needs TEXT,
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  image_consent BOOLEAN DEFAULT false,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create guardians table
CREATE TABLE public.guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  photo_url TEXT,
  relationship VARCHAR(50) NOT NULL DEFAULT 'Pai/Mãe',
  access_pin VARCHAR(6),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create child_guardians junction table
CREATE TABLE public.child_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  can_pickup BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, guardian_id)
);

-- Create authorized_pickups table for additional authorized people
CREATE TABLE public.authorized_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  authorized_name VARCHAR(255) NOT NULL,
  authorized_phone VARCHAR(20),
  authorized_photo TEXT,
  relationship VARCHAR(50),
  pickup_pin VARCHAR(6),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create child_check_ins table for entry/exit control
CREATE TABLE public.child_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_name VARCHAR(100) NOT NULL DEFAULT 'Culto',
  classroom VARCHAR(100),
  label_number VARCHAR(10),
  qr_code TEXT NOT NULL UNIQUE,
  checked_in_at TIMESTAMPTZ DEFAULT now(),
  checked_in_by UUID REFERENCES auth.users(id),
  checked_out_at TIMESTAMPTZ,
  checked_out_by UUID REFERENCES auth.users(id),
  pickup_person_name VARCHAR(255),
  pickup_method VARCHAR(20) DEFAULT 'QR',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_check_ins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for children
CREATE POLICY "Staff can manage children" ON public.children
  FOR ALL USING (
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

CREATE POLICY "Parents can view their children" ON public.children
  FOR SELECT USING (
    id IN (
      SELECT cg.child_id FROM public.child_guardians cg
      JOIN public.guardians g ON g.id = cg.guardian_id
      WHERE g.profile_id = auth.uid()
    )
  );

-- RLS Policies for guardians
CREATE POLICY "Staff can manage guardians" ON public.guardians
  FOR ALL USING (
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

CREATE POLICY "Users can view their own guardian profile" ON public.guardians
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can update their own guardian profile" ON public.guardians
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- RLS Policies for child_guardians
CREATE POLICY "Staff can manage child_guardians" ON public.child_guardians
  FOR ALL USING (
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

CREATE POLICY "Parents can view their child links" ON public.child_guardians
  FOR SELECT USING (
    guardian_id IN (
      SELECT id FROM public.guardians WHERE profile_id = auth.uid()
    )
  );

-- RLS Policies for authorized_pickups
CREATE POLICY "Staff can manage authorized_pickups" ON public.authorized_pickups
  FOR ALL USING (
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

CREATE POLICY "Parents can view authorized pickups for their children" ON public.authorized_pickups
  FOR SELECT USING (
    child_id IN (
      SELECT cg.child_id FROM public.child_guardians cg
      JOIN public.guardians g ON g.id = cg.guardian_id
      WHERE g.profile_id = auth.uid()
    )
  );

-- RLS Policies for child_check_ins
CREATE POLICY "Staff can manage check_ins" ON public.child_check_ins
  FOR ALL USING (
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

CREATE POLICY "Parents can view their children check_ins" ON public.child_check_ins
  FOR SELECT USING (
    child_id IN (
      SELECT cg.child_id FROM public.child_guardians cg
      JOIN public.guardians g ON g.id = cg.guardian_id
      WHERE g.profile_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_children_church ON public.children(church_id);
CREATE INDEX idx_guardians_church ON public.guardians(church_id);
CREATE INDEX idx_guardians_profile ON public.guardians(profile_id);
CREATE INDEX idx_child_guardians_child ON public.child_guardians(child_id);
CREATE INDEX idx_child_guardians_guardian ON public.child_guardians(guardian_id);
CREATE INDEX idx_authorized_pickups_child ON public.authorized_pickups(child_id);
CREATE INDEX idx_child_check_ins_child ON public.child_check_ins(child_id);
CREATE INDEX idx_child_check_ins_church ON public.child_check_ins(church_id);
CREATE INDEX idx_child_check_ins_date ON public.child_check_ins(event_date);
CREATE INDEX idx_child_check_ins_qr ON public.child_check_ins(qr_code);

-- Create updated_at triggers
CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guardians_updated_at
  BEFORE UPDATE ON public.guardians
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_authorized_pickups_updated_at
  BEFORE UPDATE ON public.authorized_pickups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
