import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const redirectUri = `${supabaseUrl}/functions/v1/google-auth-callback`;

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    // Exchange code for tokens
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
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    const tokens = await tokenResponse.json();

    // Validate tokens before proceeding
    if (!tokens.access_token || !tokens.refresh_token || !tokens.id_token) {
      throw new Error('Invalid token response from Google: missing required tokens');
    }

    // Validate token lengths (OAuth tokens are typically 100-2048 chars)
    if (tokens.access_token.length > 2048 || tokens.refresh_token.length > 2048 || tokens.id_token.length > 2048) {
      throw new Error('Token length exceeds maximum allowed size');
    }

    // Validate token format - should be alphanumeric with some special chars
    const tokenRegex = /^[A-Za-z0-9\-._~+/]+=*$/;
    if (!tokenRegex.test(tokens.access_token) || !tokenRegex.test(tokens.refresh_token)) {
      throw new Error('Invalid token format detected');
    }

    console.log('OAuth successful, creating Supabase session');

    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Sign in with Google ID token to create a Supabase session
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithIdToken({
      provider: 'google',
      token: tokens.id_token,
    });

    if (sessionError || !sessionData.session) {
      throw new Error(`Failed to create session: ${sessionError?.message || 'No session returned'}`);
    }

    console.log('Session created successfully');

    // Note: OAuth tokens are stored in session storage on the client side
    // The full integration (with sheet_id, church_id, etc.) will be created
    // by the frontend when the user selects a specific sheet to integrate

    // Get redirect URL from environment
    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    if (!appBaseUrl) {
      throw new Error('APP_BASE_URL environment variable not set');
    }

    // Prepare cookies for session
    const cookies = [
      setCookie('sb-access-token', sessionData.session.access_token),
      setCookie('sb-refresh-token', sessionData.session.refresh_token),
      // Clear state and nonce cookies
      setCookie('oauth-state', '', 0),
      setCookie('oauth-nonce', '', 0),
    ];

    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${appBaseUrl}/integracoes`,
        'Set-Cookie': cookies.join(', '),
      },
    });
  } catch (error) {
    console.error('Error in google-auth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Get redirect URL from environment
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '';
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${appBaseUrl}/integracoes?auth=error&message=${encodeURIComponent(errorMessage)}`,
      },
    });
  }
});