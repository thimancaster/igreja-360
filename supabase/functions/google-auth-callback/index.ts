import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    if (!state) {
      throw new Error('No state parameter received');
    }

    // Decode user ID from state
    let userId: string;
    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.userId;
      if (!userId) {
        throw new Error('Invalid state: missing userId');
      }
    } catch (e) {
      throw new Error('Invalid state parameter');
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const redirectUri = `${supabaseUrl}/functions/v1/google-auth-callback`;

    // Exchange code for tokens
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
      console.error('Token exchange failed:', errorData); // Server-side only
      throw new Error('Failed to exchange authorization code'); // Generic message
    }

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Google OAuth Callback - User ID from state:', userId);

    // Store tokens securely using encrypted storage function
    const { data: sessionId, error: sessionError } = await supabase.rpc(
      'store_encrypted_oauth_session',
      {
        p_user_id: userId,
        p_access_token: tokens.access_token,
        p_refresh_token: tokens.refresh_token || null,
      }
    );

    if (sessionError || !sessionId) {
      console.error('Failed to create encrypted OAuth session:', sessionError);
      throw new Error('Failed to create secure session');
    }

    console.log('Created encrypted OAuth session:', sessionId);

    // Redirect back to app with session ID
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://igreja-360.lovable.app';
    const redirectUrl = `${appBaseUrl}/app/integracoes?oauth_session=${sessionId}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });

  } catch (error) {
    console.error('Error in google-auth-callback:', error);
    
    // Map errors to safe error codes instead of exposing raw error messages
    const errorMessage = error instanceof Error ? error.message : '';
    let errorCode = 'auth_failed';
    
    if (errorMessage.includes('No authorization code')) {
      errorCode = 'missing_code';
    } else if (errorMessage.includes('state')) {
      errorCode = 'invalid_state';
    } else if (errorMessage.includes('exchange')) {
      errorCode = 'token_exchange_failed';
    } else if (errorMessage.includes('environment')) {
      errorCode = 'config_error';
    }
    
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://igreja-360.lovable.app';
    const errorUrl = `${appBaseUrl}/app/integracoes?oauth_error_code=${errorCode}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...getCorsHeaders(null),
        'Location': errorUrl,
      },
    });
  }
});
