-- Prompt 1: Reverter estratégia de integração para OAuth 2.0
-- Remove sheet_url e adiciona access_token e refresh_token

-- Remove a coluna sheet_url
ALTER TABLE public.google_integrations 
DROP COLUMN IF EXISTS sheet_url;

-- Adiciona as colunas de OAuth de volta
ALTER TABLE public.google_integrations 
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Garante que as políticas RLS estão corretas
-- (As políticas já existentes estão corretas: SELECT, INSERT, UPDATE, DELETE para auth.uid() = user_id)