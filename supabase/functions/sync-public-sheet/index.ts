import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  createContentHash,
  createExternalId,
  normalizeString,
  amountsAreEqual,
  createSyncStats,
  logSyncAction,
  type SyncStats
} from "../_shared/deduplication.ts";

interface ExistingTransaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  status: string;
  due_date: string | null;
  payment_date: string | null;
  external_id: string | null;
  category_id: string | null;
  ministry_id: string | null;
  notes: string | null;
}

// Parse value from Google's visualization format
function parseGvizValue(cell: unknown): unknown {
  if (!cell || typeof cell !== 'object') return null;
  const c = cell as { v?: unknown; f?: string };
  if (c.v !== undefined) return c.v;
  if (c.f !== undefined) return c.f;
  return null;
}

// Parse numeric value (handles Brazilian currency format)
function parseNumericValue(value: unknown): number {
  if (typeof value === 'number') return Math.abs(value);
  if (typeof value !== 'string') return 0;
  
  // Remove currency symbols and spaces
  let cleaned = value.replace(/[R$\s]/g, '').trim();
  
  // Handle Brazilian format (1.234,56 -> 1234.56)
  if (cleaned.includes(',')) {
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
function parseDate(value: unknown): string | null {
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
    
    // Handle Google's Date(year, month, day) format
    if (value.startsWith('Date(')) {
      const match = value.match(/Date\((\d+),(\d+),(\d+)/);
      if (match) {
        const [, year, month, day] = match;
        const m = parseInt(month) + 1; // Month is 0-indexed
        return `${year}-${m.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }
  
  return null;
}

// Determine transaction type
function parseType(value: unknown): 'Receita' | 'Despesa' {
  if (!value) return 'Despesa';
  
  const str = String(value).toLowerCase().trim();
  
  if (str.includes('receita') || str.includes('entrada') || str.includes('crédito') || str.includes('credito')) {
    return 'Receita';
  }
  
  return 'Despesa';
}

// Determine status - For Receita, always return Pago
function parseStatus(value: unknown, type: string, paymentDate: string | null, dueDate: string | null): string {
  // Receitas are always confirmed/paid
  if (type === 'Receita') {
    return 'Pago';
  }
  
  // If has payment date, it's paid
  if (paymentDate) {
    return 'Pago';
  }
  
  if (!value) {
    // Infer from due date
    if (dueDate) {
      const today = new Date().toISOString().split('T')[0];
      return dueDate < today ? 'Vencido' : 'Pendente';
    }
    return 'Pendente';
  }
  
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
function sanitizeString(value: unknown): string {
  if (!value) return '';
  return String(value).trim().slice(0, 500);
}

/**
 * Determines the action to take based on content-based deduplication
 * Priority:
 * 1. Match by content hash (same description, amount, due_date, type)
 * 2. If matched, check if any fields changed → update
 * 3. If no match → insert
 */
function determineTransactionAction(
  incoming: {
    description: string;
    amount: number;
    type: string;
    due_date: string | null;
    payment_date: string | null;
    status: string;
    category_id: string | null;
    ministry_id: string | null;
    notes: string | null;
  },
  incomingExternalId: string,
  existingByExternalId: Map<string, ExistingTransaction>,
  existingByContentHash: Map<string, ExistingTransaction>
): { action: 'insert' | 'update' | 'skip'; existingId?: string; changes?: Record<string, unknown>; reason: string } {
  
  // Step 1: Check by external_id first (fastest path)
  const byExtId = existingByExternalId.get(incomingExternalId);
  if (byExtId) {
    // Check for meaningful changes
    const changes: Record<string, unknown> = {};
    
    if (normalizeString(incoming.description) !== normalizeString(byExtId.description)) {
      changes.description = incoming.description;
    }
    if (!amountsAreEqual(incoming.amount, byExtId.amount)) {
      changes.amount = incoming.amount;
    }
    if (incoming.due_date !== byExtId.due_date) {
      changes.due_date = incoming.due_date;
    }
    if (incoming.payment_date !== byExtId.payment_date) {
      changes.payment_date = incoming.payment_date;
    }
    if (incoming.status.toLowerCase() !== byExtId.status.toLowerCase()) {
      changes.status = incoming.status;
    }
    if (incoming.category_id !== byExtId.category_id && incoming.category_id) {
      changes.category_id = incoming.category_id;
    }
    if (incoming.ministry_id !== byExtId.ministry_id && incoming.ministry_id) {
      changes.ministry_id = incoming.ministry_id;
    }
    if (normalizeString(incoming.notes) !== normalizeString(byExtId.notes) && incoming.notes) {
      changes.notes = incoming.notes;
    }
    
    if (Object.keys(changes).length > 0) {
      return { action: 'update', existingId: byExtId.id, changes, reason: 'Dados alterados' };
    }
    return { action: 'skip', existingId: byExtId.id, reason: 'Já existe, sem alterações' };
  }
  
  // Step 2: Check by content hash (handles new external_id format or legacy data)
  const contentHash = createContentHash(incoming.description, incoming.amount, incoming.due_date, incoming.type);
  const byHash = existingByContentHash.get(contentHash);
  
  if (byHash) {
    // Found by hash - update external_id to new format and check for other changes
    const changes: Record<string, unknown> = { external_id: incomingExternalId };
    
    if (incoming.payment_date !== byHash.payment_date && incoming.payment_date) {
      changes.payment_date = incoming.payment_date;
    }
    if (incoming.status.toLowerCase() !== byHash.status.toLowerCase()) {
      changes.status = incoming.status;
    }
    if (incoming.category_id !== byHash.category_id && incoming.category_id) {
      changes.category_id = incoming.category_id;
    }
    if (incoming.ministry_id !== byHash.ministry_id && incoming.ministry_id) {
      changes.ministry_id = incoming.ministry_id;
    }
    if (normalizeString(incoming.notes) !== normalizeString(byHash.notes) && incoming.notes) {
      changes.notes = incoming.notes;
    }
    
    // If only external_id changed, just update silently and skip
    if (Object.keys(changes).length === 1) {
      return { action: 'update', existingId: byHash.id, changes, reason: 'Atualizando ID externo' };
    }
    
    return { action: 'update', existingId: byHash.id, changes, reason: 'Encontrado por hash, atualizando dados' };
  }
  
  // Step 3: Check for similar transactions (fuzzy match to prevent near-duplicates)
  for (const [, existing] of existingByContentHash) {
    const sameAmount = amountsAreEqual(incoming.amount, existing.amount);
    const sameDate = incoming.due_date === existing.due_date;
    const sameType = incoming.type.toLowerCase() === existing.type.toLowerCase();
    
    // If same amount, date, and type, check description similarity
    if (sameAmount && sameDate && sameType) {
      const descA = normalizeString(incoming.description);
      const descB = normalizeString(existing.description);
      
      // Simple similarity check: one contains the other or very similar
      if (descA === descB || descA.includes(descB) || descB.includes(descA)) {
        return { 
          action: 'skip', 
          existingId: existing.id, 
          reason: `Similar: "${existing.description}"` 
        };
      }
    }
  }
  
  // Step 4: No match found, insert new
  return { action: 'insert', reason: 'Nova transação' };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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

    console.log(`[sync-public-sheet] Starting sync for integration ${integrationId}, sheet ${integration.sheet_id}`);

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
    table.cols.forEach((col: { label?: string; id?: string }, index: number) => {
      const label = col.label || col.id || `Coluna ${col.id}`;
      Object.entries(columnMapping).forEach(([field, mappedCol]) => {
        if (mappedCol === label) {
          colIndexMap[field] = index;
        }
      });
    });

    console.log(`[sync-public-sheet] Column mapping resolved:`, colIndexMap);

    // Fetch ALL existing transactions for this church (not just from this origin)
    // This prevents duplicates across different import methods
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('id, description, amount, due_date, payment_date, type, status, external_id, category_id, ministry_id, notes')
      .eq('church_id', integration.church_id);

    // Build lookup maps using content-based hashing
    const existingByExternalId = new Map<string, ExistingTransaction>();
    const existingByContentHash = new Map<string, ExistingTransaction>();
    
    (existingTransactions || []).forEach((t: ExistingTransaction) => {
      // Map by external_id
      if (t.external_id) {
        existingByExternalId.set(t.external_id, t);
      }
      
      // Map by content hash (only keep first occurrence to avoid issues)
      const hash = createContentHash(t.description, t.amount, t.due_date, t.type);
      if (!existingByContentHash.has(hash)) {
        existingByContentHash.set(hash, t);
      }
    });

    console.log(`[sync-public-sheet] Found ${existingTransactions?.length || 0} existing transactions`);
    console.log(`[sync-public-sheet] Indexed: ${existingByExternalId.size} by external_id, ${existingByContentHash.size} by content hash`);

    // Process rows
    const stats = createSyncStats();
    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: { id: string; changes: Record<string, unknown> }[] = [];
    const rows = table.rows || [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const cells = row.c || [];
      
      try {
        // Get values based on mapping
        const getValue = (field: string) => {
          const idx = colIndexMap[field];
          if (idx === undefined) return null;
          return parseGvizValue(cells[idx]);
        };

        const description = sanitizeString(getValue('description'));
        const amount = parseNumericValue(getValue('amount'));
        const type = parseType(getValue('type'));
        const dueDateRaw = parseDate(getValue('due_date'));
        const paymentDateRaw = parseDate(getValue('payment_date'));
        const rawStatus = getValue('status');

        // Skip invalid rows
        if (!description || description.length < 2) {
          continue;
        }
        
        if (amount <= 0) {
          logSyncAction(stats, rowIndex + 2, 'skip', description, 'Valor inválido');
          continue;
        }

        // For Receita, use payment_date instead of due_date
        const paymentDate = type === 'Receita' ? (dueDateRaw || paymentDateRaw || new Date().toISOString().split('T')[0]) : paymentDateRaw;
        const dueDate = type === 'Receita' ? null : dueDateRaw;
        const status = parseStatus(rawStatus, type, paymentDate, dueDate);

        // Create CONTENT-BASED external_id (not row-based!)
        const contentHash = createContentHash(description, amount, dueDate, type);
        const externalId = createExternalId(integration.sheet_id, contentHash);

        // Prepare transaction data
        const transactionData = {
          description,
          amount,
          type,
          due_date: dueDate,
          payment_date: paymentDate,
          status,
          category_id: null as string | null,
          ministry_id: null as string | null,
          notes: null as string | null
        };

        // Determine action using intelligent deduplication
        const result = determineTransactionAction(
          transactionData,
          externalId,
          existingByExternalId,
          existingByContentHash
        );

        if (result.action === 'insert') {
          toInsert.push({
            church_id: integration.church_id,
            ...transactionData,
            origin: 'Planilha Pública',
            created_by: user.id,
            external_id: externalId
          });
          logSyncAction(stats, rowIndex + 2, 'insert', description, result.reason);
          
          // Add to content hash map to prevent duplicates in same batch
          existingByContentHash.set(contentHash, {
            id: 'pending',
            ...transactionData,
            external_id: externalId
          });
          
        } else if (result.action === 'update' && result.existingId) {
          // Only count as update if more than just external_id changed
          const meaningfulChanges = Object.keys(result.changes || {}).filter(k => k !== 'external_id');
          
          if (meaningfulChanges.length > 0) {
            toUpdate.push({
              id: result.existingId,
              changes: { ...result.changes, updated_at: new Date().toISOString() }
            });
            logSyncAction(stats, rowIndex + 2, 'update', description, result.reason);
          } else if (result.changes?.external_id) {
            // Silently update external_id for future syncs
            toUpdate.push({
              id: result.existingId,
              changes: { external_id: result.changes.external_id }
            });
            logSyncAction(stats, rowIndex + 2, 'skip', description, 'Apenas ID externo atualizado');
          } else {
            logSyncAction(stats, rowIndex + 2, 'skip', description, result.reason);
          }
          
        } else {
          logSyncAction(stats, rowIndex + 2, 'skip', description, result.reason);
        }
        
      } catch (rowError) {
        console.error(`[sync-public-sheet] Error processing row ${rowIndex + 2}:`, rowError);
        logSyncAction(stats, rowIndex + 2, 'error', `Linha ${rowIndex + 2}`, String(rowError));
      }
    }

    console.log(`[sync-public-sheet] Processing: ${toInsert.length} inserts, ${toUpdate.length} updates, ${stats.skipped} skipped`);

    // Insert new transactions in batch
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(toInsert);

      if (insertError) {
        console.error('[sync-public-sheet] Insert error:', insertError);
        await supabase
          .from('public_sheet_integrations')
          .update({ sync_status: 'error' })
          .eq('id', integrationId);
          
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao inserir transações: ' + insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update existing transactions
    let updateErrors = 0;
    for (const update of toUpdate) {
      if (Object.keys(update.changes).length === 0) continue;
      
      const { error } = await supabase
        .from('transactions')
        .update(update.changes)
        .eq('id', update.id);
      
      if (error) {
        console.error(`[sync-public-sheet] Update error for ${update.id}:`, error);
        updateErrors++;
      }
    }

    // Calculate final stats (subtract silent external_id updates from update count)
    const meaningfulUpdates = toUpdate.filter(u => 
      Object.keys(u.changes).filter(k => k !== 'external_id').length > 0
    ).length;

    // Update integration status
    await supabase
      .from('public_sheet_integrations')
      .update({
        sync_status: stats.errors > 0 || updateErrors > 0 ? 'partial' : 'success',
        last_sync_at: new Date().toISOString(),
        records_synced: toInsert.length + meaningfulUpdates
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
        records_inserted: toInsert.length,
        records_updated: meaningfulUpdates,
        records_skipped: stats.skipped,
        status: stats.errors > 0 || updateErrors > 0 ? 'partial' : 'success',
        sync_type: syncType,
        error_message: stats.errors > 0 ? `${stats.errors + updateErrors} erros durante sincronização` : null
      });

    console.log(`[sync-public-sheet] Sync complete. Inserted: ${toInsert.length}, Updated: ${meaningfulUpdates}, Skipped: ${stats.skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        recordsInserted: toInsert.length,
        recordsUpdated: meaningfulUpdates,
        recordsSkipped: stats.skipped,
        errors: stats.errors + updateErrors,
        message: `${toInsert.length} novas transações, ${meaningfulUpdates} atualizadas, ${stats.skipped} ignoradas.`,
        details: stats.details.slice(0, 50) // Return first 50 details for debugging
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-public-sheet] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
