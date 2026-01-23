import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  createContentHash,
  createExternalId,
  normalizeString,
  amountsAreEqual,
  createSyncStats,
  logSyncAction
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

// Simple HTML sanitization for Edge Function (no external dependencies)
function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim();
}

// Validation schema for transaction data with sanitization
const transactionSchema = z.object({
  church_id: z.string().uuid(),
  created_by: z.string().uuid(),
  origin: z.string().max(100).transform(sanitizeString),
  description: z.string().max(500).transform(sanitizeString).pipe(
    z.string().min(1, 'Description is required')
  ),
  amount: z.number().finite().safe(),
  type: z.enum(['Receita', 'Despesa']),
  status: z.enum(['Pendente', 'Pago', 'Vencido']),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(1000).transform(sanitizeString).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  ministry_id: z.string().uuid().nullable().optional(),
  external_id: z.string().max(100).nullable().optional(),
});

const RATE_LIMIT_MINUTES = 5;
const MAX_ROWS_PER_SYNC = 1000;

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

/**
 * Determines the action to take based on content-based deduplication
 */
function determineTransactionAction(
  incoming: {
    description: string;
    amount: number;
    type: string;
    due_date: string | null;
    payment_date: string | null;
    status: string;
  },
  incomingExternalId: string,
  existingByExternalId: Map<string, ExistingTransaction>,
  existingByContentHash: Map<string, ExistingTransaction>
): { action: 'insert' | 'update' | 'skip'; existingId?: string; changes?: Record<string, unknown>; reason: string } {
  
  // Step 1: Check by external_id first (fastest path)
  const byExtId = existingByExternalId.get(incomingExternalId);
  if (byExtId) {
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
    
    if (Object.keys(changes).length > 0) {
      return { action: 'update', existingId: byExtId.id, changes, reason: 'Dados alterados' };
    }
    return { action: 'skip', existingId: byExtId.id, reason: 'Já existe, sem alterações' };
  }
  
  // Step 2: Check by content hash (handles new external_id format or legacy data)
  const contentHash = createContentHash(incoming.description, incoming.amount, incoming.due_date, incoming.type);
  const byHash = existingByContentHash.get(contentHash);
  
  if (byHash) {
    const changes: Record<string, unknown> = { external_id: incomingExternalId };
    
    if (incoming.payment_date !== byHash.payment_date && incoming.payment_date) {
      changes.payment_date = incoming.payment_date;
    }
    if (incoming.status.toLowerCase() !== byHash.status.toLowerCase()) {
      changes.status = incoming.status;
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
    
    if (sameAmount && sameDate && sameType) {
      const descA = normalizeString(incoming.description);
      const descB = normalizeString(existing.description);
      
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
    const body = await req.json();
    const { integrationId, syncType = 'manual' } = body;
    const authHeader = req.headers.get('Authorization')!;

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
      console.error('Google OAuth credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Google integration not properly configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract user ID from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify user owns this integration
    if (integration.user_id !== user.id) {
      console.warn(`Unauthorized sync attempt: user ${user.id} tried to sync integration ${integrationId}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not own this integration' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // RATE LIMITING: Check last sync time
    if (integration.last_sync_at) {
      const lastSync = new Date(integration.last_sync_at);
      const now = new Date();
      const minutesSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60);
      
      if (minutesSinceLastSync < RATE_LIMIT_MINUTES) {
        const retryAfter = Math.ceil(RATE_LIMIT_MINUTES - minutesSinceLastSync);
        return new Response(
          JSON.stringify({ 
            error: `Rate limit exceeded. Please wait ${retryAfter} minutes before syncing again.`,
            retryAfter: retryAfter * 60
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter * 60) } 
          }
        );
      }
    }

    if (!integration.sheet_id) {
      return new Response(
        JSON.stringify({ error: 'Sheet ID not found for this integration.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-sheet] Starting sync for integration ${integrationId} by user ${user.id}`);

    // Get decrypted OAuth tokens from database
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('get_decrypted_integration', { integration_id: integrationId });

    if (tokenError || !tokenData || tokenData.length === 0) {
      console.error('Failed to get OAuth tokens:', tokenError);
      return new Response(
        JSON.stringify({ error: 'OAuth tokens not found. Please reconnect your Google account.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = tokenData[0].access_token;
    const refreshToken = tokenData[0].refresh_token;
    const sheetId = integration.sheet_id;

    // Try to fetch sheet data with current access token
    let sheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:ZZ`,
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } }
    );

    // If token expired, refresh and retry
    if (sheetResponse.status === 401 && refreshToken) {
      console.log('[sync-sheet] Access token expired, refreshing...');
      const newAccessToken = await refreshGoogleToken(refreshToken, googleClientId, googleClientSecret);
      
      if (!newAccessToken) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Google access token. Please reconnect your Google account.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase.rpc('store_encrypted_integration_tokens', {
        p_integration_id: integrationId,
        p_access_token: newAccessToken,
        p_refresh_token: refreshToken,
      });

      accessToken = newAccessToken;
      
      sheetResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:ZZ`,
        { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } }
      );
    }

    if (!sheetResponse.ok) {
      const errorData = await sheetResponse.text();
      console.error('[sync-sheet] Google Sheets API error:', errorData);
      throw new Error('Failed to fetch sheet data from Google Sheets API');
    }

    const sheetData = await sheetResponse.json();
    const rows = sheetData.values || [];

    if (rows.length === 0) {
      throw new Error('Sheet is empty or no data found.');
    }

    if (rows.length > MAX_ROWS_PER_SYNC + 1) {
      return new Response(
        JSON.stringify({ error: `Sheet exceeds maximum of ${MAX_ROWS_PER_SYNC} rows.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);
    const mapping = integration.column_mapping as Record<string, string>;

    console.log(`[sync-sheet] Processing ${dataRows.length} rows`);

    // Fetch ALL existing transactions for this church (not just from this origin)
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('id, description, amount, due_date, payment_date, type, status, external_id, category_id, ministry_id, notes')
      .eq('church_id', integration.church_id);

    // Build lookup maps using content-based hashing
    const existingByExternalId = new Map<string, ExistingTransaction>();
    const existingByContentHash = new Map<string, ExistingTransaction>();
    
    (existingTransactions || []).forEach((t: ExistingTransaction) => {
      if (t.external_id) {
        existingByExternalId.set(t.external_id, t);
      }
      const hash = createContentHash(t.description, Math.abs(Number(t.amount)), t.due_date, t.type);
      if (!existingByContentHash.has(hash)) {
        existingByContentHash.set(hash, t);
      }
    });

    console.log(`[sync-sheet] Found ${existingTransactions?.length || 0} existing transactions`);
    console.log(`[sync-sheet] Indexed: ${existingByExternalId.size} by external_id, ${existingByContentHash.size} by content hash`);

    // Process rows
    const stats = createSyncStats();
    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: { id: string; changes: Record<string, unknown> }[] = [];
    const validationErrors: string[] = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      try {
        const transaction: Record<string, unknown> = {
          church_id: integration.church_id,
          created_by: integration.user_id,
          origin: 'Google Sheets',
        };

        // Map columns according to the stored mapping
        for (const [field, columnName] of Object.entries(mapping)) {
          const columnIndex = headers.indexOf(columnName);
          if (columnIndex !== -1 && row[columnIndex]) {
            let value: unknown = row[columnIndex];

            if (field === 'amount') {
              const cleanValue = String(value).replace(/[^\d.,-]/g, '').replace(',', '.');
              value = parseFloat(cleanValue);
              if (isNaN(value as number)) {
                validationErrors.push(`Row ${i + 2}: Invalid amount value`);
                continue;
              }
              value = Math.abs(value as number);
            } else if (field === 'due_date' || field === 'payment_date') {
              const dateStr = String(value);
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }

            transaction[field] = value;
          }
        }

        const description = sanitizeString(transaction.description as string);
        const amount = Math.abs(Number(transaction.amount) || 0);
        
        if (!description || description.length < 2) {
          continue;
        }
        
        if (amount <= 0) {
          logSyncAction(stats, i + 2, 'skip', description, 'Valor inválido');
          continue;
        }

        // Set defaults
        if (!transaction.status) transaction.status = 'Pendente';
        if (!transaction.type) transaction.type = amount > 0 ? 'Receita' : 'Despesa';

        const type = transaction.type as string;
        let dueDate = transaction.due_date as string | null;
        let paymentDate = transaction.payment_date as string | null;
        let status = transaction.status as string;

        // For Receita, auto-set status to Pago and handle dates
        if (type === 'Receita') {
          status = 'Pago';
          if (dueDate && !paymentDate) {
            paymentDate = dueDate;
          }
          if (!paymentDate) {
            paymentDate = new Date().toISOString().split('T')[0];
          }
          dueDate = null;
        }

        // Create CONTENT-BASED external_id
        const contentHash = createContentHash(description, amount, dueDate, type);
        const externalId = createExternalId(integration.sheet_id, contentHash);

        // Determine action using intelligent deduplication
        const result = determineTransactionAction(
          { description, amount, type, due_date: dueDate, payment_date: paymentDate, status },
          externalId,
          existingByExternalId,
          existingByContentHash
        );

        if (result.action === 'insert') {
          try {
            const validated = transactionSchema.parse({
              ...transaction,
              description,
              amount,
              type,
              status,
              due_date: dueDate,
              payment_date: paymentDate,
              external_id: externalId
            });
            toInsert.push(validated);
            logSyncAction(stats, i + 2, 'insert', description, result.reason);
            
            // Add to content hash map to prevent duplicates in same batch
            existingByContentHash.set(contentHash, {
              id: 'pending',
              description,
              amount,
              type,
              status,
              due_date: dueDate,
              payment_date: paymentDate,
              external_id: externalId,
              category_id: null,
              ministry_id: null,
              notes: null
            });
          } catch (error) {
            if (error instanceof z.ZodError) {
              validationErrors.push(`Row ${i + 2}: ${error.errors.map(e => e.message).join(', ')}`);
              logSyncAction(stats, i + 2, 'error', description, 'Validation failed');
            }
          }
          
        } else if (result.action === 'update' && result.existingId) {
          const meaningfulChanges = Object.keys(result.changes || {}).filter(k => k !== 'external_id');
          
          if (meaningfulChanges.length > 0) {
            toUpdate.push({
              id: result.existingId,
              changes: { ...result.changes, updated_at: new Date().toISOString() }
            });
            logSyncAction(stats, i + 2, 'update', description, result.reason);
          } else if (result.changes?.external_id) {
            toUpdate.push({
              id: result.existingId,
              changes: { external_id: result.changes.external_id }
            });
            logSyncAction(stats, i + 2, 'skip', description, 'Apenas ID externo atualizado');
          } else {
            logSyncAction(stats, i + 2, 'skip', description, result.reason);
          }
          
        } else {
          logSyncAction(stats, i + 2, 'skip', description, result.reason);
        }
        
      } catch (rowError) {
        console.error(`[sync-sheet] Error processing row ${i + 2}:`, rowError);
        logSyncAction(stats, i + 2, 'error', `Linha ${i + 2}`, String(rowError));
      }
    }

    if (validationErrors.length > 0 && toInsert.length === 0 && toUpdate.length === 0) {
      console.warn('[sync-sheet] Validation errors:', validationErrors);
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed for some rows',
          validationErrors: validationErrors.slice(0, 10),
          totalErrors: validationErrors.length
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-sheet] Processing: ${toInsert.length} inserts, ${toUpdate.length} updates, ${stats.skipped} skipped`);

    // Insert new transactions in batch
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(toInsert);

      if (insertError) {
        console.error('[sync-sheet] Insert error:', insertError);
        throw new Error('Falha ao importar transações. Verifique os dados e tente novamente.');
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
        console.error(`[sync-sheet] Update error for ${update.id}:`, error);
        updateErrors++;
      }
    }

    // Calculate final stats
    const meaningfulUpdates = toUpdate.filter(u => 
      Object.keys(u.changes).filter(k => k !== 'external_id').length > 0
    ).length;

    // Update last sync time
    await supabase
      .from('google_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integrationId);

    // Save sync history
    await supabase
      .from('sync_history')
      .insert({
        church_id: integration.church_id,
        user_id: user.id,
        integration_id: integrationId,
        integration_type: 'google',
        records_inserted: toInsert.length,
        records_updated: meaningfulUpdates,
        records_skipped: stats.skipped,
        status: stats.errors > 0 || updateErrors > 0 ? 'partial' : 'success',
        sync_type: syncType,
        error_message: stats.errors > 0 ? `${stats.errors + updateErrors} erros durante sincronização` : null
      });

    console.log(`[sync-sheet] Sync complete. Inserted: ${toInsert.length}, Updated: ${meaningfulUpdates}, Skipped: ${stats.skipped}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recordsInserted: toInsert.length,
        recordsUpdated: meaningfulUpdates,
        recordsSkipped: stats.skipped,
        errors: stats.errors + updateErrors,
        message: `${toInsert.length} novas transações, ${meaningfulUpdates} atualizadas, ${stats.skipped} ignoradas.`,
        validationErrors: validationErrors.length > 0 ? validationErrors.slice(0, 5) : undefined,
        details: stats.details.slice(0, 50)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[sync-sheet] Error:', error);
    const safeMessages = ['Falha ao importar transações', 'Rate limit exceeded', 'Sheet exceeds maximum', 'Validation failed'];
    const errorMessage = error instanceof Error ? error.message : '';
    const isSafeMessage = safeMessages.some(msg => errorMessage.includes(msg));
    
    return new Response(
      JSON.stringify({ 
        error: 'Falha na sincronização', 
        details: isSafeMessage ? errorMessage : 'Erro interno. Tente novamente mais tarde.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
