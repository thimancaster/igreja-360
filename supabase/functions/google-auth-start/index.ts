import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const frontendBaseUrl = Deno.env.get('FRONTEND_BASE_URL'); // Nova variável para a URL do frontend
    const supabaseFunctionsUrl = Deno.env.get('SUPABASE_FUNCTIONS_URL'); // Nova variável para a URL das funções Supabase

    if (!supabaseUrl || !anonKey || !clientId || !frontendBaseUrl || !supabaseFunctionsUrl) {
      const errorMessage = 'Erro de configuração do servidor: Faltando SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_CLIENT_ID, FRONTEND_BASE_URL, ou SUPABASE_FUNCTIONS_URL.';
      console.error(errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado: Faltando cabeçalho de Autorização.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      supabaseUrl,
      anonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Falha na autenticação do usuário:', userError);
      return new Response(JSON.stringify({ error: 'Usuário não autenticado: Token inválido.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Usar SUPABASE_FUNCTIONS_URL para o URI de redirecionamento do Google
    const redirectUri = `${supabaseFunctionsUrl}/functions/v1/google-auth-callback`;
    const state = Math.random().toString(36).substring(2);
    const nonce = Math.random().toString(36).substring(2);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/spreadsheets.readonly');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);

    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', 'application/json');
    headers.append('Set-Cookie', `oauth-state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    headers.append('Set-Cookie', `oauth-nonce=${nonce}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);

    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: headers,
      status: 200,
    });

  } catch (error) {
    console.error('Erro inesperado em google-auth-start:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});