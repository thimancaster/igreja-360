-- PASSO 1: Garantir que o trigger handle_new_user está conectado ao auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASSO 2: Criar profiles faltantes para todos os usuários já registrados
INSERT INTO public.profiles (id, full_name)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- PASSO 3: Criar roles 'user' faltantes para usuários sem nenhuma role
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'user'::app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id
);

-- PASSO 4: Vincular profiles a igrejas onde o usuário é dono (mais recente)
UPDATE public.profiles p
SET church_id = (
  SELECT c.id 
  FROM public.churches c 
  WHERE c.owner_user_id = p.id 
  ORDER BY c.created_at DESC 
  LIMIT 1
)
WHERE p.church_id IS NULL
  AND EXISTS (SELECT 1 FROM public.churches c WHERE c.owner_user_id = p.id);

-- PASSO 5: Adicionar role 'admin' ao dono de cada igreja (se ainda não tiver)
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT c.owner_user_id, 'admin'::app_role
FROM public.churches c
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r 
  WHERE r.user_id = c.owner_user_id AND r.role = 'admin'
)
ON CONFLICT (user_id, role) DO NOTHING;
