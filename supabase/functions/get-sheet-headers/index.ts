import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders } from "../_shared/cors.ts";
import { isValidSheetId } from "../_shared/validation.ts";
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from "../_shared/rate-limit.ts";

// Function to refresh Google access token using refresh token
async function refreshGoogleToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Google token:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheetId, accessToken, refreshToken } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate sheetId format
    if (!sheetId || !isValidSheetId(sheetId)) {
      return new Response(
        JSON.stringify({ error: 'ID da planilha inválido. Verifique a URL da planilha.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Access token is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract user ID from auth header for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      
      if (user) {
        // Rate limiting check
        const rateLimitResult = checkRateLimit(`sheet-headers:${user.id}`, RATE_LIMITS.SHEET_HEADERS);
        if (!rateLimitResult.allowed) {
          return createRateLimitResponse(rateLimitResult, corsHeaders);
        }
      }
    }

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    let currentAccessToken = accessToken;

    // Try to fetch sheet headers (first row only)
    let sheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/1:1`,
      {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    // If token expired and we have refresh token, try to refresh
    if (sheetResponse.status === 401 && refreshToken && googleClientId && googleClientSecret) {
      console.log('Access token expired, attempting to refresh...');
      const newAccessToken = await refreshGoogleToken(refreshToken, googleClientId, googleClientSecret);
      
      if (newAccessToken) {
        currentAccessToken = newAccessToken;
        
        // Retry with new token
        sheetResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/1:1`,
          {
            headers: {
              'Authorization': `Bearer ${currentAccessToken}`,
              'Accept': 'application/json',
            },
          }
        );
      }
    }

    if (!sheetResponse.ok) {
      const errorText = await sheetResponse.text();
      console.error('Google Sheets API error:', errorText);
      
      if (sheetResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Token de acesso expirado. Por favor, reconecte sua conta Google.' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (sheetResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: 'Sem permissão para acessar esta planilha. Verifique as permissões de compartilhamento.' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (sheetResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Planilha não encontrada. Verifique se a URL está correta.' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Falha ao acessar a planilha do Google Sheets' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const sheetData = await sheetResponse.json();
    const headers = sheetData.values?.[0] || [];

    if (headers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'A planilha está vazia ou a primeira linha não contém cabeçalhos.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Also get sheet metadata for the sheet name
    const metadataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties`,
      {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    let sheetName = 'Planilha';
    if (metadataResponse.ok) {
      const metadata = await metadataResponse.json();
      sheetName = metadata.properties?.title || 'Planilha';
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        headers,
        sheetName,
        newAccessToken: currentAccessToken !== accessToken ? currentAccessToken : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-sheet-headers:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar a solicitação' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      }
    );
  }
});
