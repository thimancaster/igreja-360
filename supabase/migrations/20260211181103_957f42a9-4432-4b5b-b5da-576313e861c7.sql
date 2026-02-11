
-- Resolve linter by removing pg_net (no dependents)
DROP EXTENSION IF EXISTS pg_net CASCADE;
