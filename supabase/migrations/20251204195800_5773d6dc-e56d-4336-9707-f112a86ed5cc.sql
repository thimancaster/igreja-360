-- Fix RLS policies to use 'authenticated' role instead of 'public'
-- This addresses the "Anonymous Access Policies" warning from Supabase linter

-- Fix user_roles policies
DROP POLICY IF EXISTS "Admins and Tesoureiros can manage roles" ON public.user_roles;
CREATE POLICY "Admins and Tesoureiros can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role));

DROP POLICY IF EXISTS "Users can view roles from their church" ON public.user_roles;
CREATE POLICY "Users can view roles from their church"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id IN (
  SELECT profiles.id FROM profiles
  WHERE profiles.church_id = (
    SELECT profiles_1.church_id FROM profiles profiles_1
    WHERE profiles_1.id = auth.uid()
  )
));

-- Fix churches INSERT policy
DROP POLICY IF EXISTS "Users can create their own church" ON public.churches;
CREATE POLICY "Users can create their own church"
ON public.churches FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_user_id);

-- Fix notifications DELETE policy
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Fix oauth_sessions policies
DROP POLICY IF EXISTS "Users can read own oauth sessions" ON public.oauth_sessions;
CREATE POLICY "Users can read own oauth sessions"
ON public.oauth_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own oauth sessions" ON public.oauth_sessions;
CREATE POLICY "Users can delete own oauth sessions"
ON public.oauth_sessions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Service role insert stays with public but requires service_role in practice
DROP POLICY IF EXISTS "Service role can insert oauth sessions" ON public.oauth_sessions;
CREATE POLICY "Service role can insert oauth sessions"
ON public.oauth_sessions FOR INSERT TO service_role
WITH CHECK (true);