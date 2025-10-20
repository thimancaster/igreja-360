// supabase/functions/google-auth-start/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts' // Verifique se este caminho está correto

// Helper para gerar strings aleatórias seguras
const generateRandomString = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const charactersLength = characters.length
  const buffer = new Uint8Array(length)
  crypto.getRandomValues(buffer)
  for (let i = 0; i < length; i++) {
    result += characters.charAt(buffer[i] % charactersLength)
  }
  return result
}

serve(async (req) => {
  // Tratamento da requisição OPTIONS para CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')

    if (!supabaseUrl || !googleClientId) {
      console.error('Missing environment variables: SUPABASE_URL or GOOGLE_CLIENT_ID')
      throw new Error('Configuration error: Missing Google Client ID or Supabase URL.')
    }

    // --- CORREÇÃO PRINCIPAL ---
    // Usar o URL FIXO da função de CALLBACK, não o da função START
    const redirectUri = `${supabaseUrl}/functions/v1/google-auth-callback`
    // --- FIM DA CORREÇÃO ---

    // Gerar state e nonce para segurança CSRF e Replay Attack
    const state = generateRandomString(32)
    const nonce = generateRandomString(32)

    // Construir a URL de autorização do Google
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', googleClientId)
    authUrl.searchParams.set('redirect_uri', redirectUri) // Envia o URI de callback correto
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.metadata.readonly') // Adicionado escopo do Drive para listar ficheiros
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('nonce', nonce)
    authUrl.searchParams.set('access_type', 'offline') // Para obter refresh_token
    authUrl.searchParams.set('prompt', 'consent') // Forçar consentimento para garantir refresh_token

    // Definir cookies HttpOnly para state e nonce
    const headers = new Headers({
      ...corsHeaders,
      'Location': authUrl.toString(),
      // Configurar cookies de forma segura (Max-Age=300 -> 5 minutos)
      'Set-Cookie': `sb-google-oauth-state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300, sb-google-oauth-nonce=${nonce}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`,
    })

    // Redirecionar o utilizador para o Google
    return new Response(null, { status: 302, headers })

  } catch (error) {
    console.error('Error in google-auth-start:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Adicione o ficheiro _shared/cors.ts se não existir:
/*
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Em produção, restrinja para o seu domínio
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
*/