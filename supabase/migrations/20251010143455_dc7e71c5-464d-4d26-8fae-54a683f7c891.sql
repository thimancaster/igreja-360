-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles (CRITICAL: separate table for security)
CREATE TYPE public.app_role AS ENUM ('admin', 'tesoureiro', 'pastor', 'lider');

-- Tabela de Igrejas (Multi-tenant)
CREATE TABLE public.churches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    city VARCHAR(255),
    state VARCHAR(2),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Perfis de Usuário (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Roles (SECURITY: separate from profiles)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, role)
);

-- Security Definer Function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Tabela de Ministérios
CREATE TABLE public.ministries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (church_id, name)
);

-- Tabela de Categorias Financeiras
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('Receita', 'Despesa')),
    icon VARCHAR(50),
    color VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (church_id, name, type)
);

-- Tabela de Transações Financeiras
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
    ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('Receita', 'Despesa')),
    due_date DATE,
    payment_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Vencido', 'Cancelado')),
    origin VARCHAR(50) DEFAULT 'Manual',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Uploads de Planilhas
CREATE TABLE public.sheet_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'Processando' CHECK (status IN ('Processando', 'Concluido', 'Erro')),
    error_details TEXT,
    records_imported INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Mapeamento de Colunas
CREATE TABLE public.column_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    mapping_name VARCHAR(255) NOT NULL,
    source_column VARCHAR(255) NOT NULL,
    target_field VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (church_id, mapping_name, source_column)
);

-- Tabela de Notificações
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'Info' CHECK (type IN ('Alerta', 'Info', 'Erro', 'Sucesso')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security on all tables
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for churches (admin can see all, others see only their church)
CREATE POLICY "Users can view their own church"
ON public.churches FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT church_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Admins can manage churches"
ON public.churches FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles from their church"
ON public.profiles FOR SELECT
TO authenticated
USING (
    church_id IN (
        SELECT church_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles from their church"
ON public.user_roles FOR SELECT
TO authenticated
USING (
    user_id IN (
        SELECT id FROM public.profiles 
        WHERE church_id = (
            SELECT church_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Admins and Tesoureiros can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro')
);

-- RLS Policies for ministries
CREATE POLICY "Users can view ministries from their church"
ON public.ministries FOR SELECT
TO authenticated
USING (
    church_id IN (
        SELECT church_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Admins and Tesoureiros can manage ministries"
ON public.ministries FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro') OR
    public.has_role(auth.uid(), 'pastor')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro') OR
    public.has_role(auth.uid(), 'pastor')
);

-- RLS Policies for categories
CREATE POLICY "Users can view categories from their church"
ON public.categories FOR SELECT
TO authenticated
USING (
    church_id IN (
        SELECT church_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Admins and Tesoureiros can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro')
);

-- RLS Policies for transactions
CREATE POLICY "Users can view transactions from their church"
ON public.transactions FOR SELECT
TO authenticated
USING (
    church_id IN (
        SELECT church_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Liders can only view their ministry transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'lider') AND
    ministry_id IN (
        SELECT id FROM public.ministries 
        WHERE church_id = (SELECT church_id FROM public.profiles WHERE id = auth.uid())
    )
);

CREATE POLICY "Admins and Tesoureiros can manage all transactions"
ON public.transactions FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro') OR
    public.has_role(auth.uid(), 'pastor')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro') OR
    public.has_role(auth.uid(), 'pastor')
);

-- RLS Policies for sheet_uploads
CREATE POLICY "Users can view uploads from their church"
ON public.sheet_uploads FOR SELECT
TO authenticated
USING (
    church_id IN (
        SELECT church_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Tesoureiros can manage uploads"
ON public.sheet_uploads FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro')
);

-- RLS Policies for column_mappings
CREATE POLICY "Users can view mappings from their church"
ON public.column_mappings FOR SELECT
TO authenticated
USING (
    church_id IN (
        SELECT church_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Tesoureiros can manage mappings"
ON public.column_mappings FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tesoureiro')
);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_churches_updated_at
    BEFORE UPDATE ON public.churches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ministries_updated_at
    BEFORE UPDATE ON public.ministries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sheet_uploads_updated_at
    BEFORE UPDATE ON public.sheet_uploads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_column_mappings_updated_at
    BEFORE UPDATE ON public.column_mappings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default categories for testing (will be church-specific in production)
-- These are just examples, real data will be inserted per church