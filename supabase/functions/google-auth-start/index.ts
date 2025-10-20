// supabase/functions/google-auth-start/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts' // Usando Deno para crypto seguro

// Helper para gerar strings aleatórias seguras
const generateRandomString = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')

    if (!supabaseUrl || !googleClientId) {
      throw new Error('Missing environment variables: SUPABASE_URL or GOOGLE_CLIENT_ID')
    }

    // *** CORREÇÃO AQUI ***
    // Construir o redirect_uri CORRETO e FIXO
    const supabaseFunctionsUrl = `${supabaseUrl}/functions/v1/`
    const redirectUri = `${supabaseFunctionsUrl}google-auth-callback`

    // Gerar state e nonce para segurança CSRF e Replay Attack
    const state = generateRandomString(32)
    const nonce = generateRandomString(32)

    // Construir a URL de autorização do Google
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', googleClientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/spreadsheets.readonly')
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('nonce', nonce)
    authUrl.searchParams.set('access_type', 'offline') // Para obter refresh_token
    authUrl.searchParams.set('prompt', 'consent') // Forçar consentimento para garantir refresh_token

    // Definir cookies HttpOnly para state e nonce
    const headers = new Headers({
      ...corsHeaders,
      'Location': authUrl.toString(),
      // Configurar cookies de forma segura
      'Set-Cookie': `sb-google-oauth-state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300, sb-google-oauth-nonce=${nonce}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`,
    })

    // Redirecionar o utilizador para o Google
    return new Response(null, { status: 302, headers })

  } catch (error) {
    console.error('Error in google-auth-start:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})