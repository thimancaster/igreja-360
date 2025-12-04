-- Fix ALL remaining RLS policies to use 'authenticated' role

-- categories
DROP POLICY IF EXISTS "Admins and Tesoureiros can manage categories" ON public.categories;
CREATE POLICY "Admins and Tesoureiros can manage categories"
ON public.categories FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role));

DROP POLICY IF EXISTS "Users can view categories from their church" ON public.categories;
CREATE POLICY "Users can view categories from their church"
ON public.categories FOR SELECT TO authenticated
USING (church_id IN (SELECT profiles.church_id FROM profiles WHERE profiles.id = auth.uid()));

-- churches (remaining policies)
DROP POLICY IF EXISTS "Admins can manage churches" ON public.churches;
CREATE POLICY "Admins can manage churches"
ON public.churches FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own church" ON public.churches;
CREATE POLICY "Users can view their own church"
ON public.churches FOR SELECT TO authenticated
USING (id IN (SELECT profiles.church_id FROM profiles WHERE profiles.id = auth.uid()));

-- column_mappings
DROP POLICY IF EXISTS "Tesoureiros can manage mappings" ON public.column_mappings;
CREATE POLICY "Tesoureiros can manage mappings"
ON public.column_mappings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role));

DROP POLICY IF EXISTS "Users can view mappings from their church" ON public.column_mappings;
CREATE POLICY "Users can view mappings from their church"
ON public.column_mappings FOR SELECT TO authenticated
USING (church_id IN (SELECT profiles.church_id FROM profiles WHERE profiles.id = auth.uid()));

-- google_integrations
DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.google_integrations;
CREATE POLICY "Users can delete their own integrations"
ON public.google_integrations FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.google_integrations;
CREATE POLICY "Users can insert their own integrations"
ON public.google_integrations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own integrations" ON public.google_integrations;
CREATE POLICY "Users can update their own integrations"
ON public.google_integrations FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own integrations" ON public.google_integrations;
CREATE POLICY "Users can view their own integrations"
ON public.google_integrations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ministries
DROP POLICY IF EXISTS "Admins and Tesoureiros can manage ministries" ON public.ministries;
CREATE POLICY "Admins and Tesoureiros can manage ministries"
ON public.ministries FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role) OR has_role(auth.uid(), 'pastor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role) OR has_role(auth.uid(), 'pastor'::app_role));

DROP POLICY IF EXISTS "Users can view ministries from their church" ON public.ministries;
CREATE POLICY "Users can view ministries from their church"
ON public.ministries FOR SELECT TO authenticated
USING (church_id IN (SELECT profiles.church_id FROM profiles WHERE profiles.id = auth.uid()));

-- notifications (remaining policies)
DROP POLICY IF EXISTS "Service role can create notifications" ON public.notifications;
CREATE POLICY "Service role can create notifications"
ON public.notifications FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can view profiles from their church" ON public.profiles;
CREATE POLICY "Users can view profiles from their church"
ON public.profiles FOR SELECT TO authenticated
USING (church_id = get_user_church_id(auth.uid()));

-- sheet_uploads
DROP POLICY IF EXISTS "Tesoureiros can manage uploads" ON public.sheet_uploads;
CREATE POLICY "Tesoureiros can manage uploads"
ON public.sheet_uploads FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role));

DROP POLICY IF EXISTS "Users can view uploads from their church" ON public.sheet_uploads;
CREATE POLICY "Users can view uploads from their church"
ON public.sheet_uploads FOR SELECT TO authenticated
USING (church_id IN (SELECT profiles.church_id FROM profiles WHERE profiles.id = auth.uid()));

-- transactions
DROP POLICY IF EXISTS "Admins and Tesoureiros can manage all transactions" ON public.transactions;
CREATE POLICY "Admins and Tesoureiros can manage all transactions"
ON public.transactions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role) OR has_role(auth.uid(), 'pastor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role) OR has_role(auth.uid(), 'pastor'::app_role));

DROP POLICY IF EXISTS "Liders can only view their ministry transactions" ON public.transactions;
CREATE POLICY "Liders can only view their ministry transactions"
ON public.transactions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'lider'::app_role) AND ministry_id IN (
  SELECT ministries.id FROM ministries
  WHERE ministries.church_id = (SELECT profiles.church_id FROM profiles WHERE profiles.id = auth.uid())
));

DROP POLICY IF EXISTS "Users can view transactions from their church" ON public.transactions;
CREATE POLICY "Users can view transactions from their church"
ON public.transactions FOR SELECT TO authenticated
USING (church_id IN (SELECT profiles.church_id FROM profiles WHERE profiles.id = auth.uid()));