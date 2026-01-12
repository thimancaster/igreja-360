import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract sheet ID from URL
function extractSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Parse value from Google's visualization format
function parseGvizValue(cell: any): any {
  if (!cell) return null;
  if (cell.v !== undefined) return cell.v;
  if (cell.f !== undefined) return cell.f;
  return null;
}

// Parse numeric value (handles Brazilian currency format)
function parseNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  
  // Remove currency symbols and spaces
  let cleaned = value.replace(/[R$\s]/g, '').trim();
  
  // Handle Brazilian format (1.234,56 -> 1234.56)
  if (cleaned.includes(',')) {
    // Check if it's Brazilian format (comma as decimal separator)
    if (cleaned.match(/\.\d{3}/)) {
      // Has thousand separator with dots
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Just comma as decimal
      cleaned = cleaned.replace(',', '.');
    }
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

// Parse date (handles various formats)
function parseDate(value: any): string | null {
  if (!value) return null;
  
  // If it's already a Date object from Google
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // Handle string dates
  if (typeof value === 'string') {
    // Try DD/MM/YYYY format
    const brMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (brMatch) {
      const [, day, month, year] = brMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try YYYY-MM-DD format
    const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return value.split('T')[0];
    }
  }
  
  // Handle Google's Date(year, month, day) format
  if (typeof value === 'string' && value.startsWith('Date(')) {
    const match = value.match(/Date\((\d+),(\d+),(\d+)/);
    if (match) {
      const [, year, month, day] = match;
      const m = parseInt(month) + 1; // Month is 0-indexed
      return `${year}-${m.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  return null;
}

// Determine transaction type
function parseType(value: any): string {
  if (!value) return 'Despesa';
  
  const str = String(value).toLowerCase().trim();
  
  if (str.includes('receita') || str.includes('entrada') || str.includes('crédito') || str.includes('credito')) {
    return 'Receita';
  }
  
  return 'Despesa';
}

// Determine status
function parseStatus(value: any): string {
  if (!value) return 'Pendente';
  
  const str = String(value).toLowerCase().trim();
  
  if (str.includes('pago') || str.includes('paga') || str.includes('quitado') || str.includes('realizado')) {
    return 'Pago';
  }
  
  if (str.includes('vencid') || str.includes('atrasad')) {
    return 'Vencido';
  }
  
  return 'Pendente';
}

// Sanitize string
function sanitizeString(value: any): string {
  if (!value) return '';
  return String(value).trim().slice(0, 500);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's token for auth verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { integrationId } = await req.json();
    
    if (!integrationId) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID da integração não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the integration
    const { data: integration, error: integrationError } = await supabase
      .from('public_sheet_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single();

    if (integrationError || !integration) {
      console.error('[sync-public-sheet] Integration not found:', integrationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Integração não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-public-sheet] Syncing integration ${integrationId} for sheet ${integration.sheet_id}`);

    // Update sync status
    await supabase
      .from('public_sheet_integrations')
      .update({ sync_status: 'syncing' })
      .eq('id', integrationId);

    // Fetch sheet data
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${integration.sheet_id}/gviz/tq?tqx=out:json`;
    const response = await fetch(gvizUrl);

    if (!response.ok) {
      await supabase
        .from('public_sheet_integrations')
        .update({ sync_status: 'error' })
        .eq('id', integrationId);
        
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível acessar a planilha. Verifique se ela está pública.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await response.text();
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
    
    if (!jsonMatch) {
      await supabase
        .from('public_sheet_integrations')
        .update({ sync_status: 'error' })
        .eq('id', integrationId);
        
      return new Response(
        JSON.stringify({ success: false, error: 'Formato de resposta inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = JSON.parse(jsonMatch[1]);
    const table = data.table;
    const columnMapping = integration.column_mapping as Record<string, string>;

    // Build column index map
    const colIndexMap: Record<string, number> = {};
    table.cols.forEach((col: any, index: number) => {
      const label = col.label || col.id || `Coluna ${col.id}`;
      Object.entries(columnMapping).forEach(([field, mappedCol]) => {
        if (mappedCol === label) {
          colIndexMap[field] = index;
        }
      });
    });

    console.log(`[sync-public-sheet] Column mapping:`, colIndexMap);

    // Process rows
    const transactions: any[] = [];
    const rows = table.rows || [];

    for (const row of rows) {
      const cells = row.c || [];
      
      // Get values based on mapping
      const getValue = (field: string) => {
        const idx = colIndexMap[field];
        if (idx === undefined) return null;
        return parseGvizValue(cells[idx]);
      };

      const description = sanitizeString(getValue('description'));
      const amount = parseNumericValue(getValue('amount'));
      const type = parseType(getValue('type'));
      const dueDate = parseDate(getValue('due_date'));
      const status = parseStatus(getValue('status'));

      // Skip invalid rows
      if (!description || amount <= 0) {
        continue;
      }

      transactions.push({
        church_id: integration.church_id,
        description,
        amount,
        type,
        due_date: dueDate,
        status,
        origin: 'Planilha Pública',
        created_by: user.id,
      });
    }

    console.log(`[sync-public-sheet] Processed ${transactions.length} valid transactions`);

    // Insert transactions
    let recordsImported = 0;
    if (transactions.length > 0) {
      const { error: insertError, data: insertedData } = await supabase
        .from('transactions')
        .insert(transactions)
        .select();

      if (insertError) {
        console.error('[sync-public-sheet] Insert error:', insertError);
        await supabase
          .from('public_sheet_integrations')
          .update({ sync_status: 'error' })
          .eq('id', integrationId);
          
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao importar: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      recordsImported = insertedData?.length || 0;
    }

    // Update integration status
    await supabase
      .from('public_sheet_integrations')
      .update({
        sync_status: 'success',
        last_sync_at: new Date().toISOString(),
        records_synced: (integration.records_synced || 0) + recordsImported,
      })
      .eq('id', integrationId);

    console.log(`[sync-public-sheet] Sync complete. Imported ${recordsImported} records`);

    return new Response(
      JSON.stringify({
        success: true,
        recordsImported,
        message: `${recordsImported} transações importadas com sucesso.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-public-sheet] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
