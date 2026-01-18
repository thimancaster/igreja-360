-- Fix overly permissive RLS policy on notifications table
DROP POLICY IF EXISTS "Service role can create notifications" ON public.notifications;

-- Create more restrictive policy that validates the user_id and church_id
CREATE POLICY "Service role can create valid notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (
  user_id IS NOT NULL 
  AND church_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = user_id)
  AND EXISTS (SELECT 1 FROM public.churches WHERE id = church_id)
);

-- Fix overly permissive RLS policy on sync_history table
DROP POLICY IF EXISTS "Service role can insert sync history" ON public.sync_history;

-- Create more restrictive policy that validates church_id and integration_id
CREATE POLICY "Service role can insert valid sync history"
ON public.sync_history
FOR INSERT
TO service_role
WITH CHECK (
  church_id IS NOT NULL
  AND integration_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.churches WHERE id = church_id)
);

-- Move pg_net extension from public schema to extensions schema
-- First, drop from public and recreate in extensions
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;