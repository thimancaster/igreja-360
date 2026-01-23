import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Extract sheet ID from various Google Sheets URL formats
function extractSheetId(url: string): string | null {
  // Pattern 1: /d/{sheetId}/
  const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];

  // Pattern 2: spreadsheets/d/{sheetId}
  const match2 = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];

  return null;
}

// Validate that URL is from Google Sheets domain
function isValidGoogleSheetsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'docs.google.com' && url.includes('/spreadsheets/');
  } catch {
    return false;
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheetUrl } = await req.json();

    if (!sheetUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL da planilha não fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL domain
    if (!isValidGoogleSheetsUrl(sheetUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL inválida. Use uma URL do Google Sheets.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível extrair o ID da planilha da URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-public-sheet-headers] Fetching headers for sheet: ${sheetId}`);

    // Fetch data using Google's public visualization API
    // This works for sheets that are "Published to the web" or "Anyone with the link can view"
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
    
    const response = await fetch(gvizUrl);
    
    if (!response.ok) {
      console.error(`[get-public-sheet-headers] Failed to fetch sheet: ${response.status}`);
      
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Planilha não é pública. Certifique-se de publicar a planilha na web (Arquivo → Publicar na web) ou compartilhar como "Qualquer pessoa com o link".' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ success: false, error: 'Planilha não encontrada. Verifique a URL.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Erro ao acessar a planilha: ${response.status}`);
    }

    const text = await response.text();
    
    // The response is wrapped in a callback, we need to extract the JSON
    // Format: /*O_o*/ google.visualization.Query.setResponse({...})
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
    
    if (!jsonMatch) {
      console.error('[get-public-sheet-headers] Could not parse response');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível ler a planilha. Verifique se ela está publicada na web.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = JSON.parse(jsonMatch[1]);
    
    if (data.status === 'error') {
      console.error('[get-public-sheet-headers] Query error:', data.errors);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.errors?.[0]?.message || 'Erro ao consultar a planilha' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract headers from the column labels
    const table = data.table;
    const headers: string[] = table.cols.map((col: any) => col.label || col.id || `Coluna ${col.id}`);

    // Filter out empty headers
    const validHeaders = headers.filter((h: string) => h && h.trim() !== '');

    console.log(`[get-public-sheet-headers] Found ${validHeaders.length} headers`);

    return new Response(
      JSON.stringify({
        success: true,
        sheetId,
        sheetName: 'Planilha Pública',
        headers: validHeaders,
        rowCount: table.rows?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-public-sheet-headers] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
