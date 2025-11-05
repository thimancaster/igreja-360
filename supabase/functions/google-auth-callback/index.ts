import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Construir redirect_uri FIXO (mesmo da função start)
    const redirectUri = `${supabaseUrl}/functions/v1/google-auth-callback`;

    console.log('Google OAuth Callback - Redirect URI:', redirectUri);

    // Trocar o código pelo access_token e refresh_token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
      console.error('Token exchange failed:', errorData);
      throw new Error(`Failed to exchange code for token: ${errorData}`);
    }

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    console.log('OAuth tokens received successfully');

    // Criar cliente Supabase com service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obter o usuário autenticado do header Authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log('User authenticated:', user.id);

    // Redirecionar de volta para a aplicação com sucesso
    const appUrl = Deno.env.get('APP_BASE_URL') || supabaseUrl;
    const redirectUrl = `${appUrl}/app/integracoes?oauth_success=true&access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token || ''}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });

  } catch (error) {
    console.error('Error in google-auth-callback:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const appUrl = Deno.env.get('APP_BASE_URL') || Deno.env.get('SUPABASE_URL');
    const errorUrl = `${appUrl}/app/integracoes?oauth_error=${encodeURIComponent(errorMessage)}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': errorUrl,
      },
    });
  }
});
