-- Corrigir a função store_encrypted_oauth_session que estava tentando inserir em colunas inexistentes
CREATE OR REPLACE FUNCTION public.store_encrypted_oauth_session(
  p_user_id uuid,
  p_access_token text,
  p_refresh_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  new_session_id uuid;
BEGIN
  INSERT INTO public.oauth_sessions (
    user_id, 
    access_token_enc, 
    refresh_token_enc
  )
  VALUES (
    p_user_id, 
    private.encrypt_token(p_access_token), 
    private.encrypt_token(p_refresh_token)
  )
  RETURNING id INTO new_session_id;
  
  RETURN new_session_id;
END;
$$;

-- Adicionar permissões para usuários autenticados chamarem as funções de descriptografia
GRANT EXECUTE ON FUNCTION public.get_decrypted_oauth_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_decrypted_integration(uuid) TO authenticated;