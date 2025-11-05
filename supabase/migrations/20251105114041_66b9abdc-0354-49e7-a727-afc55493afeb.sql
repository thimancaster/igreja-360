-- Prompt 3: Habilitar acesso de administrador para thimancaster@hotmail.com

-- Inserir role 'admin' para o usuário thimancaster@hotmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'thimancaster@hotmail.com'
ON CONFLICT (user_id, role) DO NOTHING;