-- Drop the old unique constraint that doesn't allow NULL values
ALTER TABLE public.churches DROP CONSTRAINT IF EXISTS churches_cnpj_key;