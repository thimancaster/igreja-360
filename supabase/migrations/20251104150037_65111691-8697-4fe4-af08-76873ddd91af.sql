-- Add sheet_url column to google_integrations if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'google_integrations' 
    AND column_name = 'sheet_url'
  ) THEN
    ALTER TABLE public.google_integrations ADD COLUMN sheet_url TEXT;
  END IF;
END $$;

-- Drop old token columns that are not being used
ALTER TABLE public.google_integrations DROP COLUMN IF EXISTS refresh_token;
ALTER TABLE public.google_integrations DROP COLUMN IF EXISTS access_token;

-- Update notifications RLS policy - only service role can insert
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND policyname = 'System can create notifications'
  ) THEN
    DROP POLICY "System can create notifications" ON public.notifications;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND policyname = 'Service role can create notifications'
  ) THEN
    CREATE POLICY "Service role can create notifications"
    ON public.notifications FOR INSERT
    TO service_role
    WITH CHECK (true);
  END IF;
END $$;

-- Split google_integrations RLS policies for better auditing
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'google_integrations' 
    AND policyname = 'Users can manage their own integrations'
  ) THEN
    DROP POLICY "Users can manage their own integrations" ON public.google_integrations;
  END IF;
  
  -- Create specific policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'google_integrations' 
    AND policyname = 'Users can view their own integrations'
  ) THEN
    CREATE POLICY "Users can view their own integrations"
    ON public.google_integrations FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'google_integrations' 
    AND policyname = 'Users can insert their own integrations'
  ) THEN
    CREATE POLICY "Users can insert their own integrations"
    ON public.google_integrations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'google_integrations' 
    AND policyname = 'Users can update their own integrations'
  ) THEN
    CREATE POLICY "Users can update their own integrations"
    ON public.google_integrations FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'google_integrations' 
    AND policyname = 'Users can delete their own integrations'
  ) THEN
    CREATE POLICY "Users can delete their own integrations"
    ON public.google_integrations FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Make owner_user_id NOT NULL in churches table
UPDATE public.churches SET owner_user_id = (
  SELECT id FROM auth.users LIMIT 1
) WHERE owner_user_id IS NULL;

ALTER TABLE public.churches 
ALTER COLUMN owner_user_id SET NOT NULL;