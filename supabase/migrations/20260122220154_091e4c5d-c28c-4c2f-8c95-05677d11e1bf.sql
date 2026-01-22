-- =============================================
-- MEMBERS TABLE: Gestão de membros da igreja
-- =============================================
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  birth_date DATE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  member_since DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for members
CREATE POLICY "Users can view members from their church"
  ON public.members FOR SELECT
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins and leaders can manage members"
  ON public.members FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'tesoureiro') OR 
    has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'tesoureiro') OR 
    has_role(auth.uid(), 'pastor')
  );

-- Index for birthday queries
CREATE INDEX idx_members_birth_date ON public.members (EXTRACT(MONTH FROM birth_date), EXTRACT(DAY FROM birth_date));
CREATE INDEX idx_members_church_id ON public.members (church_id);
CREATE INDEX idx_members_status ON public.members (status);

-- =============================================
-- MEMBER_MINISTRIES: Vínculo membros-ministérios
-- =============================================
CREATE TABLE public.member_ministries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'membro',
  joined_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, ministry_id)
);

ALTER TABLE public.member_ministries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view member ministries from their church"
  ON public.member_ministries FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM members WHERE church_id IN (
        SELECT church_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage member ministries"
  ON public.member_ministries FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'tesoureiro') OR 
    has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'tesoureiro') OR 
    has_role(auth.uid(), 'pastor')
  );

-- =============================================
-- Add member_id to transactions (optional link)
-- =============================================
ALTER TABLE public.transactions 
ADD COLUMN member_id UUID REFERENCES public.members(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_member_id ON public.transactions (member_id);

-- =============================================
-- CONTRIBUTIONS: Dízimos e ofertas específicas
-- =============================================
CREATE TABLE public.contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  contribution_type VARCHAR(50) NOT NULL CHECK (contribution_type IN ('dizimo', 'oferta', 'campanha', 'voto', 'outro')),
  campaign_name VARCHAR(255),
  receipt_number VARCHAR(50),
  notes TEXT,
  receipt_generated BOOLEAN DEFAULT FALSE,
  receipt_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contributions from their church"
  ON public.contributions FOR SELECT
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage contributions"
  ON public.contributions FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'tesoureiro') OR 
    has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'tesoureiro') OR 
    has_role(auth.uid(), 'pastor')
  );

CREATE INDEX idx_contributions_church_id ON public.contributions (church_id);
CREATE INDEX idx_contributions_member_id ON public.contributions (member_id);
CREATE INDEX idx_contributions_type ON public.contributions (contribution_type);
CREATE INDEX idx_contributions_date ON public.contributions (contribution_date);

-- =============================================
-- PUSH_SUBSCRIPTIONS: Para notificações push
-- =============================================
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- Generate receipt number function
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_church_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_sequence INT;
  v_receipt TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(receipt_number, '[^0-9]', '', 'g'), '')::INT
  ), 0) + 1
  INTO v_sequence
  FROM contributions
  WHERE church_id = p_church_id
    AND receipt_number LIKE v_year || '%';
  
  v_receipt := v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
  RETURN v_receipt;
END;
$$;

-- =============================================
-- Get birthdays this month function
-- =============================================
CREATE OR REPLACE FUNCTION public.get_birthdays_this_month(p_church_id UUID)
RETURNS TABLE (
  id UUID,
  full_name VARCHAR,
  birth_date DATE,
  phone VARCHAR,
  email VARCHAR,
  days_until INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month INT;
  v_current_day INT;
BEGIN
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  v_current_day := EXTRACT(DAY FROM CURRENT_DATE);
  
  RETURN QUERY
  SELECT 
    m.id,
    m.full_name,
    m.birth_date,
    m.phone,
    m.email,
    CASE 
      WHEN EXTRACT(DAY FROM m.birth_date) >= v_current_day 
      THEN (EXTRACT(DAY FROM m.birth_date) - v_current_day)::INT
      ELSE (EXTRACT(DAY FROM m.birth_date) + 30 - v_current_day)::INT
    END as days_until
  FROM members m
  WHERE m.church_id = p_church_id
    AND m.status = 'active'
    AND EXTRACT(MONTH FROM m.birth_date) = v_current_month
  ORDER BY EXTRACT(DAY FROM m.birth_date);
END;
$$;

-- =============================================
-- Trigger for updated_at
-- =============================================
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at
  BEFORE UPDATE ON public.contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();