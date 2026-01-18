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

// Determine status - For Receita, always return Pago
function parseStatus(value: any, type: string): string {
  // Receitas are always confirmed/paid
  if (type === 'Receita') {
    return 'Pago';
  }
  
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

// Create external_id for row tracking
function createExternalId(sheetId: string, rowIndex: number): string {
  return `public_${sheetId}_row_${rowIndex}`;
}

// Create a unique hash for transaction deduplication (fallback)
function createTransactionHash(description: string, amount: number, dueDate: string | null, type: string): string {
  const normalized = `${description.toLowerCase().trim()}|${amount}|${dueDate || ''}|${type}`;
  return btoa(unescape(encodeURIComponent(normalized)));
}

// Detect changes between existing and incoming transaction
function detectChanges(
  existing: { description: string; amount: number; due_date: string | null; type: string; status: string },
  incoming: { description: string; amount: number; due_date: string | null; type: string; status: string }
): Record<string, any> {
  const changes: Record<string, any> = {};
  
  if (existing.description !== incoming.description) {
    changes.description = incoming.description;
  }
  if (Math.abs(existing.amount - incoming.amount) > 0.01) {
    changes.amount = incoming.amount;
  }
  if (existing.due_date !== incoming.due_date) {
    changes.due_date = incoming.due_date;
  }
  if (existing.type !== incoming.type) {
    changes.type = incoming.type;
  }
  if (existing.status !== incoming.status) {
    changes.status = incoming.status;
  }
  
  return changes;
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

    const body = await req.json();
    const { integrationId, syncType = 'manual' } = body;
    
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

    // Fetch existing transactions from this origin for intelligent sync
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('id, description, amount, due_date, type, status, external_id')
      .eq('church_id', integration.church_id)
      .eq('origin', 'Planilha Pública');

    // Create maps for deduplication
    const existingByExternalId = new Map<string, any>();
    const existingByHash = new Map<string, { id: string; status: string }>();
    
    (existingTransactions || []).forEach((t: any) => {
      if (t.external_id) {
        existingByExternalId.set(t.external_id, t);
      }
      const hash = createTransactionHash(t.description, t.amount, t.due_date, t.type);
      existingByHash.set(hash, { id: t.id, status: t.status });
    });

    console.log(`[sync-public-sheet] Found ${existingByExternalId.size} by external_id, ${existingByHash.size} by hash`);

    // Process rows
    const newTransactions: any[] = [];
    const updatesToMake: { id: string; changes: Record<string, any> }[] = [];
    let skippedCount = 0;
    const changesDetected = { description: 0, amount: 0, status: 0, due_date: 0, type: 0 };
    const rows = table.rows || [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
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
      const rawStatus = getValue('status');
      const status = parseStatus(rawStatus, type);

      // Skip invalid rows
      if (!description || amount <= 0) {
        continue;
      }

      // For Receita, use payment_date instead of due_date
      const paymentDate = type === 'Receita' ? (dueDate || new Date().toISOString().split('T')[0]) : null;
      const finalDueDate = type === 'Receita' ? null : dueDate;

      // Create external_id for this row
      const externalId = createExternalId(integration.sheet_id, rowIndex);

      // Priority 1: Check by external_id
      const existingByExtId = existingByExternalId.get(externalId);
      if (existingByExtId) {
        // Found by external_id - check ALL changes
        const changes = detectChanges(
          {
            description: existingByExtId.description,
            amount: Number(existingByExtId.amount),
            due_date: existingByExtId.due_date,
            type: existingByExtId.type,
            status: existingByExtId.status,
          },
          { description, amount, due_date: finalDueDate, type, status }
        );

        if (Object.keys(changes).length > 0) {
          // Track what changed
          if (changes.description) changesDetected.description++;
          if (changes.amount) changesDetected.amount++;
          if (changes.status) changesDetected.status++;
          if (changes.due_date) changesDetected.due_date++;
          if (changes.type) changesDetected.type++;
          
          if (paymentDate && type === 'Receita') {
            changes.payment_date = paymentDate;
          }
          
          updatesToMake.push({ id: existingByExtId.id, changes });
        } else {
          skippedCount++;
        }
        continue;
      }

      // Priority 2: Check by hash (for legacy data without external_id)
      const hash = createTransactionHash(description, amount, finalDueDate, type);
      const existingByHashData = existingByHash.get(hash);
      
      if (existingByHashData) {
        // Found by hash - only update status and add external_id
        const changes: Record<string, any> = { external_id: externalId };
        if (existingByHashData.status !== status) {
          changes.status = status;
          changesDetected.status++;
        }
        
        if (Object.keys(changes).length > 1 || existingByHashData.status !== status) {
          updatesToMake.push({ id: existingByHashData.id, changes });
        } else {
          // Just add external_id for future syncs
          updatesToMake.push({ id: existingByHashData.id, changes: { external_id: externalId } });
          skippedCount++;
        }
        continue;
      }

      // Priority 3: New transaction
      newTransactions.push({
        church_id: integration.church_id,
        description,
        amount,
        type,
        due_date: finalDueDate,
        payment_date: paymentDate,
        status,
        origin: 'Planilha Pública',
        created_by: user.id,
        external_id: externalId,
      });
    }

    console.log(`[sync-public-sheet] Processing: ${newTransactions.length} new, ${updatesToMake.length} updates, ${skippedCount} skipped`);
    console.log(`[sync-public-sheet] Changes detected:`, changesDetected);

    // Insert new transactions
    let recordsInserted = 0;
    if (newTransactions.length > 0) {
      const { error: insertError, data: insertedData } = await supabase
        .from('transactions')
        .insert(newTransactions)
        .select();

      if (insertError) {
        console.error('[sync-public-sheet] Insert error:', insertError);
        await supabase
          .from('public_sheet_integrations')
          .update({ sync_status: 'error' })
          .eq('id', integrationId);
          
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao processar dados da planilha. Verifique os dados e tente novamente.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      recordsInserted = insertedData?.length || 0;
    }

    // Update existing transactions
    let recordsUpdated = 0;
    for (const update of updatesToMake) {
      if (Object.keys(update.changes).length === 0) continue;
      
      const { error } = await supabase
        .from('transactions')
        .update(update.changes)
        .eq('id', update.id);
      
      if (!error) {
        // Only count as updated if more than just external_id changed
        const significantChanges = Object.keys(update.changes).filter(k => k !== 'external_id');
        if (significantChanges.length > 0) {
          recordsUpdated++;
        }
      }
    }

    // Update integration status
    await supabase
      .from('public_sheet_integrations')
      .update({
        sync_status: 'success',
        last_sync_at: new Date().toISOString(),
        records_synced: (integration.records_synced || 0) + recordsInserted,
      })
      .eq('id', integrationId);

    // Save sync history
    await supabase
      .from('sync_history')
      .insert({
        church_id: integration.church_id,
        user_id: user.id,
        integration_id: integrationId,
        integration_type: 'public_sheet',
        records_inserted: recordsInserted,
        records_updated: recordsUpdated,
        records_skipped: skippedCount,
        status: 'success',
        sync_type: syncType,
      });

    console.log(`[sync-public-sheet] Sync complete. Inserted: ${recordsInserted}, Updated: ${recordsUpdated}, Skipped: ${skippedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        recordsInserted,
        recordsUpdated,
        recordsSkipped: skippedCount,
        changesDetected,
        message: `${recordsInserted} novas transações, ${recordsUpdated} atualizadas, ${skippedCount} ignoradas.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-public-sheet] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor. Tente novamente mais tarde.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
