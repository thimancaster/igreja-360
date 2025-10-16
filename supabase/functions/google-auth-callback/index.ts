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

    // Get user info to identify the user
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();

    console.log('OAuth successful, storing tokens and redirecting');

    // Store tokens in database for the user
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Get or create integration record with tokens
    const { error: dbError } = await supabaseClient
      .from('google_integrations')
      .upsert({
        user_id: userInfo.id,
        email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'email'
      });

    if (dbError) {
      console.error('Error storing tokens:', dbError);
    }

    // Determine the correct app URL - works in all environments
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/integracoes')[0];
    const appUrl = origin 
      ? `${origin}/integracoes?auth=success&email=${encodeURIComponent(userInfo.email)}`
      : `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/integracoes?auth=success&email=${encodeURIComponent(userInfo.email)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': appUrl,
      },
    });
  } catch (error) {
    console.error('Error in google-auth-callback:', error);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Use origin from request for better environment compatibility
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/integracoes')[0];
    const errorUrl = origin
      ? `${origin}/integracoes?auth=error&message=${encodeURIComponent(errorMessage)}`
      : `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/integracoes?auth=error&message=${encodeURIComponent(errorMessage)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': errorUrl,
      },
    });
  }
});