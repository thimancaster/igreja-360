-- Permitir que o dono consiga LER sua igreja mesmo antes do vínculo em profiles.church_id
-- (necessário para “auto-link” e para evitar loops no primeiro acesso)
DROP POLICY IF EXISTS "Owners can view their own churches" ON public.churches;
CREATE POLICY "Owners can view their own churches"
ON public.churches
FOR SELECT
USING (auth.uid() = owner_user_id);
