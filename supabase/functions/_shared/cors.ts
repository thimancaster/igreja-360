// List of allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://igreja-360.lovable.app',
  'https://id-preview--2d7e269d-10fa-4806-835c-2d5c23353fc1.lovable.app',
  'https://cxiudqwfwpdwpfyqpaxw.supabase.co',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
];

/**
 * Get CORS headers with origin validation.
 * If the origin is allowed, it's reflected back. Otherwise, the primary origin is used.
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0];
    
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Legacy export for backwards compatibility during migration.
 * @deprecated Use getCorsHeaders(origin) instead for proper origin validation.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
