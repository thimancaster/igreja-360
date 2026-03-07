
-- Enable pgcrypto in public schema so hash_guardian_pin trigger works
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Recreate the trigger function to reference extensions schema explicitly
CREATE OR REPLACE FUNCTION public.hash_guardian_pin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Only hash if PIN is being set and isn't already hashed
  IF NEW.access_pin IS NOT NULL AND 
     NEW.access_pin != '' AND 
     NEW.access_pin NOT LIKE '$2a$%' AND 
     NEW.access_pin NOT LIKE '$2b$%' THEN
    NEW.access_pin = extensions.crypt(NEW.access_pin, extensions.gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$function$;
