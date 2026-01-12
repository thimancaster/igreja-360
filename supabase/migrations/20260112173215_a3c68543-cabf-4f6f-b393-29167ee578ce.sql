-- Add explicit RESTRICTIVE policies to block UPDATE and DELETE on audit_logs
-- This ensures audit logs are immutable and provides clear documentation of security intent

-- Policy to explicitly block all UPDATE operations on audit logs
CREATE POLICY "audit_logs_no_updates"
ON public.audit_logs
FOR UPDATE
TO authenticated, service_role
USING (false);

-- Policy to explicitly block all DELETE operations on audit logs  
CREATE POLICY "audit_logs_no_deletes"
ON public.audit_logs
FOR DELETE
TO authenticated, service_role
USING (false);