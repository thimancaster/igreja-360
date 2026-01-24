-- 1. Add 'parent' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';

-- 2. Create pickup_authorizations table for temporary authorizations
CREATE TABLE public.pickup_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  authorized_by UUID NOT NULL REFERENCES public.profiles(id),
  authorized_person_name VARCHAR NOT NULL,
  authorized_person_phone VARCHAR,
  authorized_person_document VARCHAR,
  authorization_type VARCHAR NOT NULL DEFAULT 'one_time', -- 'one_time', 'date_range', 'permanent'
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  security_pin VARCHAR(6) NOT NULL,
  reason TEXT,
  approved_by_leader UUID REFERENCES public.profiles(id),
  leader_approval_required BOOLEAN DEFAULT false,
  status VARCHAR DEFAULT 'pending', -- 'pending', 'approved', 'active', 'used', 'expired', 'cancelled'
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_checkin_id UUID REFERENCES public.child_check_ins(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pickup_authorizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pickup_authorizations

-- Parents can view their own authorizations (ones they created)
CREATE POLICY "Parents can view their own authorizations"
ON public.pickup_authorizations
FOR SELECT
USING (authorized_by = auth.uid());

-- Parents can create authorizations for their children
CREATE POLICY "Parents can create authorizations for their children"
ON public.pickup_authorizations
FOR INSERT
WITH CHECK (
  authorized_by = auth.uid() AND
  child_id IN (
    SELECT cg.child_id FROM child_guardians cg
    JOIN guardians g ON g.id = cg.guardian_id
    WHERE g.profile_id = auth.uid()
  )
);

-- Parents can update their own authorizations
CREATE POLICY "Parents can update their own authorizations"
ON public.pickup_authorizations
FOR UPDATE
USING (authorized_by = auth.uid())
WITH CHECK (authorized_by = auth.uid());

-- Parents can delete their own authorizations
CREATE POLICY "Parents can delete their own authorizations"
ON public.pickup_authorizations
FOR DELETE
USING (authorized_by = auth.uid());

-- Staff can manage all authorizations
CREATE POLICY "Staff can manage pickup_authorizations"
ON public.pickup_authorizations
FOR ALL
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

-- 3. Create leader_checkout_overrides table for emergency checkouts
CREATE TABLE public.leader_checkout_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id UUID NOT NULL REFERENCES public.child_check_ins(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  pickup_person_name VARCHAR NOT NULL,
  pickup_person_document VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leader_checkout_overrides ENABLE ROW LEVEL SECURITY;

-- Only staff can manage overrides
CREATE POLICY "Staff can manage checkout overrides"
ON public.leader_checkout_overrides
FOR ALL
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

-- Parents can view overrides for their children (for transparency)
CREATE POLICY "Parents can view overrides for their children"
ON public.leader_checkout_overrides
FOR SELECT
USING (
  check_in_id IN (
    SELECT cci.id FROM child_check_ins cci
    WHERE cci.child_id IN (
      SELECT cg.child_id FROM child_guardians cg
      JOIN guardians g ON g.id = cg.guardian_id
      WHERE g.profile_id = auth.uid()
    )
  )
);

-- 4. Add indexes for performance
CREATE INDEX idx_pickup_authorizations_child_id ON public.pickup_authorizations(child_id);
CREATE INDEX idx_pickup_authorizations_status ON public.pickup_authorizations(status);
CREATE INDEX idx_pickup_authorizations_valid_until ON public.pickup_authorizations(valid_until);
CREATE INDEX idx_leader_checkout_overrides_check_in_id ON public.leader_checkout_overrides(check_in_id);

-- 5. Add trigger for updated_at
CREATE TRIGGER update_pickup_authorizations_updated_at
BEFORE UPDATE ON public.pickup_authorizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();