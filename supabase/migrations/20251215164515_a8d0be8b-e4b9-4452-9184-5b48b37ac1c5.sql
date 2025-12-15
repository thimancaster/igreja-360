-- Fase 1: Corrigir RLS Policy do profiles para permitir que usuário veja seu próprio perfil

-- Remover política problemática que causa loop circular
DROP POLICY IF EXISTS "Users can view profiles from their church" ON public.profiles;

-- Criar nova política que permite:
-- 1. Ver seu próprio perfil (SEMPRE - independente de church_id)
-- 2. Ver perfis de pessoas da mesma igreja (se tiver church_id)
CREATE POLICY "Users can view own profile or profiles from their church"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()  -- Sempre pode ver SEU próprio perfil
  OR 
  church_id = get_user_church_id(auth.uid())  -- Ou perfis da mesma igreja
);