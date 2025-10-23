import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCookies } from "https://deno.land/std@0.168.0/http/cookie.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to set cookie
function setCookie(name: string, value: string, maxAge?: number): string {
  const cookieParts = [
    `${name}=${value}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
  ];
  
  if (maxAge !== undefined) {
    cookieParts.push(`Max-Age=${maxAge}`);
  }
  
  return cookieParts.join('; ');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    const cookies = getCookies(req.headers);
    const storedState = cookies['oauth-state'];

    if (!state || !storedState || state !== storedState) {
      throw new Error('Parâmetro de estado inválido. Possível ataque CSRF.');
    }

    if (error) {
      throw new Error(`Erro OAuth: ${error}`);
    }

    if (!code) {
      throw new Error('Nenhum código de autorização recebido');
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const frontendBaseUrl = Deno.env.get('FRONTEND_BASE_URL'); // Nova variável para a URL do frontend
    const supabaseFunctionsUrl = Deno.env.get('SUPABASE_FUNCTIONS_URL'); // Nova variável para a URL das funções Supabase

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey || !frontendBaseUrl || !supabaseFunctionsUrl) {
      throw new Error('Variáveis de ambiente obrigatórias ausentes');
    }

    // Usar SUPABASE_FUNCTIONS_URL para o URI de redirecionamento do Google
    const redirectUri = `${supabaseFunctionsUrl}/functions/v1/google-auth-callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Falha na troca de token: ${errorData}`);
    }

    const tokens = await tokenResponse.json();

    if (!tokens.access_token || !tokens.id_token) {
      throw new Error('Resposta de token inválida do Google: tokens obrigatórios ausentes');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithIdToken({
      provider: 'google',
      token: tokens.id_token,
    });

    if (sessionError || !sessionData.session) {
      throw new Error(`Falha ao criar sessão: ${sessionError?.message || 'Nenhuma sessão retornada'}`);
    }

    const { error: credentialError } = await supabaseClient
      .from('user_credentials')
      .upsert({
        user_id: sessionData.user.id,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString(),
      });

    if (credentialError) {
      console.error('Falha ao armazenar credenciais do usuário:', credentialError);
      throw new Error('Não foi possível salvar os tokens de autenticação.');
    }

    // Redirecionar para o frontend usando FRONTEND_BASE_URL
    const sessionCookies = [
      setCookie('sb-access-token', sessionData.session.access_token),
      setCookie('sb-refresh-token', sessionData.session.refresh_token),
      setCookie('oauth-state', '', 0),
      setCookie('oauth-nonce', '', 0),
    ];

    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${frontendBaseUrl}/integracoes?auth=success`,
        'Set-Cookie': sessionCookies.join(', '),
      },
    });
  } catch (error) {
    console.error('Erro em google-auth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    const frontendBaseUrl = Deno.env.get('FRONTEND_BASE_URL') || '';
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${frontendBaseUrl}/integracoes?auth=error&message=${encodeURIComponent(errorMessage)}`,
      },
    });
  }
});