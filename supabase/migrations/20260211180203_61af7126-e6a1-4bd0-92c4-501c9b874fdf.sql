
-- Resolve linter: reinstall pg_net outside public schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Reinstall extension so extnamespace is not public
DROP EXTENSION IF EXISTS pg_net CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
