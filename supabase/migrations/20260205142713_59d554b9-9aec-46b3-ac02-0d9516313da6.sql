
-- =====================================================
-- SISTEMA DE ESCALAS INTELIGENTE PARA VOLUNTÁRIOS
-- =====================================================

-- 1. Criar enum para status de voluntário
CREATE TYPE public.volunteer_status AS ENUM ('pending', 'active', 'inactive');

-- 2. Criar enum para tipo de escala
CREATE TYPE public.schedule_type AS ENUM ('primary', 'backup');

-- 3. Criar enum para prioridade de comunicados
CREATE TYPE public.announcement_priority AS ENUM ('normal', 'urgent', 'meeting');

-- =====================================================
-- TABELA: department_volunteers
-- Centraliza voluntários de qualquer ministério
-- =====================================================
CREATE TABLE public.department_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) NOT NULL DEFAULT 'membro',
  skills TEXT[] DEFAULT '{}',
  status volunteer_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  term_accepted_at TIMESTAMPTZ,
  term_version VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Evitar duplicatas: um usuário não pode ser voluntário duplicado no mesmo ministério
  UNIQUE(ministry_id, profile_id)
);

-- =====================================================
-- TABELA: volunteer_schedules
-- Escalas dos voluntários
-- =====================================================
CREATE TABLE public.volunteer_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.department_volunteers(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  schedule_type schedule_type NOT NULL DEFAULT 'primary',
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: volunteer_commitment_terms
-- Versões dos termos de compromisso
-- =====================================================
CREATE TABLE public.volunteer_commitment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Apenas uma versão ativa por igreja
  UNIQUE(church_id, version)
);

-- =====================================================
-- TABELA: volunteer_announcements
-- Comunicados específicos por departamento
-- =====================================================
CREATE TABLE public.volunteer_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority announcement_priority NOT NULL DEFAULT 'normal',
  meeting_date TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: volunteer_announcement_reads
-- Rastreia leitura de comunicados
-- =====================================================
CREATE TABLE public.volunteer_announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.volunteer_announcements(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.department_volunteers(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(announcement_id, volunteer_id)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_dept_volunteers_church ON public.department_volunteers(church_id);
CREATE INDEX idx_dept_volunteers_ministry ON public.department_volunteers(ministry_id);
CREATE INDEX idx_dept_volunteers_profile ON public.department_volunteers(profile_id);
CREATE INDEX idx_dept_volunteers_status ON public.department_volunteers(status);

CREATE INDEX idx_vol_schedules_church ON public.volunteer_schedules(church_id);
CREATE INDEX idx_vol_schedules_ministry ON public.volunteer_schedules(ministry_id);
CREATE INDEX idx_vol_schedules_volunteer ON public.volunteer_schedules(volunteer_id);
CREATE INDEX idx_vol_schedules_date ON public.volunteer_schedules(schedule_date);

CREATE INDEX idx_vol_terms_church ON public.volunteer_commitment_terms(church_id);
CREATE INDEX idx_vol_terms_active ON public.volunteer_commitment_terms(is_active);

CREATE INDEX idx_vol_announcements_ministry ON public.volunteer_announcements(ministry_id);
CREATE INDEX idx_vol_announcements_published ON public.volunteer_announcements(is_published);

-- =====================================================
-- FUNÇÃO HELPER: Verifica se usuário é voluntário ativo de um ministério
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_active_volunteer_of_ministry(_user_id UUID, _ministry_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.department_volunteers dv
    WHERE dv.profile_id = _user_id
      AND dv.ministry_id = _ministry_id
      AND dv.status = 'active'
      AND dv.is_active = TRUE
  )
$$;

-- =====================================================
-- FUNÇÃO HELPER: Verifica se usuário é voluntário de qualquer ministério
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_volunteer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.department_volunteers dv
    WHERE dv.profile_id = _user_id
      AND dv.status = 'active'
      AND dv.is_active = TRUE
  )
$$;

-- =====================================================
-- FUNÇÃO HELPER: Obtém ministérios onde usuário é voluntário ativo
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_volunteer_ministries(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(dv.ministry_id), '{}')
  FROM public.department_volunteers dv
  WHERE dv.profile_id = _user_id
    AND dv.status = 'active'
    AND dv.is_active = TRUE
$$;

-- =====================================================
-- FUNÇÃO HELPER: Verifica se usuário é líder do ministério
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_ministry_leader(_user_id UUID, _ministry_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_ministries um
    WHERE um.user_id = _user_id
      AND um.ministry_id = _ministry_id
  )
$$;

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================
CREATE TRIGGER update_department_volunteers_updated_at
  BEFORE UPDATE ON public.department_volunteers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_volunteer_schedules_updated_at
  BEFORE UPDATE ON public.volunteer_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_volunteer_announcements_updated_at
  BEFORE UPDATE ON public.volunteer_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- HABILITAR RLS
-- =====================================================
ALTER TABLE public.department_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_commitment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_announcement_reads ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: department_volunteers
-- =====================================================

-- Admin, Pastor, Tesoureiro podem ver todos da igreja
CREATE POLICY "Privileged users can view all volunteers"
ON public.department_volunteers
FOR SELECT
USING (
  church_id = public.get_user_church_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'tesoureiro')
  )
);

-- Líderes podem ver voluntários dos ministérios que lideram
CREATE POLICY "Leaders can view their ministry volunteers"
ON public.department_volunteers
FOR SELECT
USING (
  public.has_role(auth.uid(), 'lider')
  AND public.is_ministry_leader(auth.uid(), ministry_id)
);

-- Voluntários podem ver seu próprio registro
CREATE POLICY "Volunteers can view own record"
ON public.department_volunteers
FOR SELECT
USING (profile_id = auth.uid());

-- Admin, Pastor podem gerenciar todos
CREATE POLICY "Admin and Pastor can manage all volunteers"
ON public.department_volunteers
FOR ALL
USING (
  church_id = public.get_user_church_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
  )
)
WITH CHECK (
  church_id = public.get_user_church_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
  )
);

-- Líderes podem gerenciar voluntários dos seus ministérios
CREATE POLICY "Leaders can manage their ministry volunteers"
ON public.department_volunteers
FOR ALL
USING (
  public.has_role(auth.uid(), 'lider')
  AND public.is_ministry_leader(auth.uid(), ministry_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'lider')
  AND public.is_ministry_leader(auth.uid(), ministry_id)
);

-- Voluntários podem atualizar seu próprio status (aceitar termo)
CREATE POLICY "Volunteers can update own status"
ON public.department_volunteers
FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- =====================================================
-- RLS POLICIES: volunteer_schedules
-- =====================================================

-- Admin, Pastor, Tesoureiro podem ver todas as escalas
CREATE POLICY "Privileged users can view all schedules"
ON public.volunteer_schedules
FOR SELECT
USING (
  church_id = public.get_user_church_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'tesoureiro')
  )
);

-- Líderes podem ver escalas dos ministérios que lideram
CREATE POLICY "Leaders can view their ministry schedules"
ON public.volunteer_schedules
FOR SELECT
USING (
  public.has_role(auth.uid(), 'lider')
  AND public.is_ministry_leader(auth.uid(), ministry_id)
);

-- Voluntários ativos podem ver escalas do seu ministério
CREATE POLICY "Active volunteers can view ministry schedules"
ON public.volunteer_schedules
FOR SELECT
USING (
  public.is_active_volunteer_of_ministry(auth.uid(), ministry_id)
);

-- Admin, Pastor podem gerenciar todas as escalas
CREATE POLICY "Admin and Pastor can manage all schedules"
ON public.volunteer_schedules
FOR ALL
USING (
  church_id = public.get_user_church_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
  )
)
WITH CHECK (
  church_id = public.get_user_church_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
  )
);

-- Líderes podem gerenciar escalas dos seus ministérios
CREATE POLICY "Leaders can manage their ministry schedules"
ON public.volunteer_schedules
FOR ALL
USING (
  public.has_role(auth.uid(), 'lider')
  AND public.is_ministry_leader(auth.uid(), ministry_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'lider')
  AND public.is_ministry_leader(auth.uid(), ministry_id)
);

-- Voluntários podem confirmar suas próprias escalas
CREATE POLICY "Volunteers can confirm own schedules"
ON public.volunteer_schedules
FOR UPDATE
USING (
  volunteer_id IN (
    SELECT id FROM public.department_volunteers
    WHERE profile_id = auth.uid() AND status = 'active'
  )
)
WITH CHECK (
  volunteer_id IN (
    SELECT id FROM public.department_volunteers
    WHERE profile_id = auth.uid() AND status = 'active'
  )
);

-- =====================================================
-- RLS POLICIES: volunteer_commitment_terms
-- =====================================================

-- Admin pode gerenciar termos
CREATE POLICY "Admin can manage terms"
ON public.volunteer_commitment_terms
FOR ALL
USING (
  church_id = public.get_user_church_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  church_id = public.get_user_church_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

-- Todos da igreja podem ver termos ativos
CREATE POLICY "Church members can view active terms"
ON public.volunteer_commitment_terms
FOR SELECT
USING (
  church_id = public.get_user_church_id(auth.uid())
  AND is_active = TRUE
);

-- =====================================================
-- RLS POLICIES: volunteer_announcements
-- =====================================================

-- Admin, Pastor podem gerenciar todos os comunicados
CREATE POLICY "Admin and Pastor can manage all announcements"
ON public.volunteer_announcements
FOR ALL
USING (
  church_id = public.get_user_church_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
  )
)
WITH CHECK (
  church_id = public.get_user_church_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
  )
);

-- Líderes podem gerenciar comunicados dos seus ministérios
CREATE POLICY "Leaders can manage their ministry announcements"
ON public.volunteer_announcements
FOR ALL
USING (
  public.has_role(auth.uid(), 'lider')
  AND public.is_ministry_leader(auth.uid(), ministry_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'lider')
  AND public.is_ministry_leader(auth.uid(), ministry_id)
);

-- Voluntários ativos podem ver comunicados publicados
CREATE POLICY "Active volunteers can view published announcements"
ON public.volunteer_announcements
FOR SELECT
USING (
  is_published = TRUE
  AND public.is_active_volunteer_of_ministry(auth.uid(), ministry_id)
);

-- =====================================================
-- RLS POLICIES: volunteer_announcement_reads
-- =====================================================

-- Voluntários podem gerenciar suas próprias leituras
CREATE POLICY "Volunteers can manage own reads"
ON public.volunteer_announcement_reads
FOR ALL
USING (
  volunteer_id IN (
    SELECT id FROM public.department_volunteers
    WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  volunteer_id IN (
    SELECT id FROM public.department_volunteers
    WHERE profile_id = auth.uid()
  )
);

-- Staff pode ver todas as leituras
CREATE POLICY "Staff can view all reads"
ON public.volunteer_announcement_reads
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'pastor')
  OR public.has_role(auth.uid(), 'lider')
);
