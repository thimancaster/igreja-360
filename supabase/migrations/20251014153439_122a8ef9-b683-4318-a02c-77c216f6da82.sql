-- Fix 1: Create get_user_church_id function to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_church_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT church_id FROM public.profiles WHERE id = _user_id
$$;

-- Fix 2: Update profiles RLS policies to use the function (prevent recursion)
DROP POLICY IF EXISTS "Users can view profiles from their church" ON public.profiles;
CREATE POLICY "Users can view profiles from their church"
ON public.profiles FOR SELECT
TO authenticated
USING (church_id = public.get_user_church_id(auth.uid()));

-- Fix 3: Restrict notification creation to service role only
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Service role can create notifications"
ON public.notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix 4: Update handle_new_user trigger to assign default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign default 'user' role to new signups
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;