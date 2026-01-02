-- =============================================
-- FASE 1: Corrigir Enum app_role (CRÍTICO)
-- =============================================
-- Adicionar 'user' ao enum app_role para que a trigger handle_new_user funcione
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

-- =============================================
-- FASE 2: Garantir políticas RLS para owners
-- =============================================
-- Recriar política de UPDATE para owners (garantir WITH CHECK)
DROP POLICY IF EXISTS "Owners can update their own church" ON public.churches;
CREATE POLICY "Owners can update their own church"
ON public.churches FOR UPDATE TO authenticated
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

-- =============================================
-- FASE 3: Limpeza de colunas obsoletas de tokens plaintext
-- =============================================
-- Remover colunas não-encriptadas (já migradas para _enc)
ALTER TABLE public.google_integrations 
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;

ALTER TABLE public.oauth_sessions
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;