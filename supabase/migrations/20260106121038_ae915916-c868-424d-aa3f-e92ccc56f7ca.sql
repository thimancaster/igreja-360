-- FASE 1: Corrigir perfis faltantes e vincular igrejas

-- 1.1 Criar profile para usuários que não têm (segurança)
INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 1.2 Garantir role admin para donos de igreja que não têm
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT c.owner_user_id, 'admin'::app_role
FROM public.churches c
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r
  WHERE r.user_id = c.owner_user_id AND r.role = 'admin'
)
ON CONFLICT DO NOTHING;