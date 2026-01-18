import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple HTML sanitization for Edge Function (no external dependencies)
function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  // Remove HTML tags and decode entities
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim();
}

// Create external_id for row tracking
function createExternalId(sheetId: string, rowIndex: number): string {
  return `google_${sheetId}_row_${rowIndex}`;
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

serve(async (req) => {
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
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract user ID from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // SECURITY: Verify user owns this integration
    if (integration.user_id !== user.id) {
      console.warn(`Unauthorized sync attempt: user ${user.id} tried to sync integration ${integrationId}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not own this integration' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter * 60)
            },
          }
        );
      }
    }

    if (!integration.sheet_id) {
      return new Response(
        JSON.stringify({ error: 'Sheet ID not found for this integration.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Starting sync for integration ${integrationId} by user ${user.id}`);

    // Get decrypted OAuth tokens from database
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('get_decrypted_integration', { integration_id: integrationId });

    if (tokenError || !tokenData || tokenData.length === 0) {
      console.error('Failed to get OAuth tokens:', tokenError);
      return new Response(
        JSON.stringify({ error: 'OAuth tokens not found. Please reconnect your Google account.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let accessToken = tokenData[0].access_token;
    const refreshToken = tokenData[0].refresh_token;

    // Use sheet_id directly from the integration
    const sheetId = integration.sheet_id;

    // Try to fetch sheet data with current access token
    let sheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:ZZ`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    // If token expired, refresh and retry
    if (sheetResponse.status === 401 && refreshToken) {
      console.log('Access token expired, refreshing...');
      const newAccessToken = await refreshGoogleToken(refreshToken, googleClientId, googleClientSecret);
      
      if (!newAccessToken) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Google access token. Please reconnect your Google account.' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Update the encrypted token in database
      await supabase.rpc('store_encrypted_integration_tokens', {
        p_integration_id: integrationId,
        p_access_token: newAccessToken,
        p_refresh_token: refreshToken,
      });

      accessToken = newAccessToken;
      
      // Retry with new token
      sheetResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:ZZ`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );
    }

    if (!sheetResponse.ok) {
      const errorData = await sheetResponse.text();
      console.error('Google Sheets API error:', errorData);
      throw new Error('Failed to fetch sheet data from Google Sheets API');
    }

    const sheetData = await sheetResponse.json();
    const rows = sheetData.values || [];

    if (rows.length === 0) {
      throw new Error('Sheet is empty or no data found.');
    }

    // Enforce max rows limit
    if (rows.length > MAX_ROWS_PER_SYNC + 1) {
      return new Response(
        JSON.stringify({ 
          error: `Sheet exceeds maximum of ${MAX_ROWS_PER_SYNC} rows. Please reduce sheet size or split into multiple sheets.`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // First row contains headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    const mapping = integration.column_mapping as Record<string, string>;

    // Fetch existing transactions from this origin for intelligent sync
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('id, description, amount, due_date, type, status, external_id')
      .eq('church_id', integration.church_id)
      .eq('origin', 'Google Sheets');

    // Create maps for deduplication
    const existingByExternalId = new Map<string, any>();
    const existingByHash = new Map<string, { id: string; status: string }>();
    
    (existingTransactions || []).forEach((t: any) => {
      if (t.external_id) {
        existingByExternalId.set(t.external_id, t);
      }
      const hash = createTransactionHash(t.description, Math.abs(Number(t.amount)), t.due_date, t.type);
      existingByHash.set(hash, { id: t.id, status: t.status });
    });

    console.log(`Found ${existingByExternalId.size} by external_id, ${existingByHash.size} by hash`);

    // Transform and validate data rows
    const newTransactions = [];
    const updatesToMake: { id: string; changes: Record<string, any> }[] = [];
    const validationErrors = [];
    let skippedCount = 0;
    const changesDetected = { description: 0, amount: 0, status: 0, due_date: 0, type: 0 };
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const transaction: any = {
        church_id: integration.church_id,
        created_by: integration.user_id,
        origin: 'Google Sheets',
      };

      // Map columns according to the stored mapping
      for (const [field, columnName] of Object.entries(mapping)) {
        const columnIndex = headers.indexOf(columnName);
        if (columnIndex !== -1 && row[columnIndex]) {
          let value = row[columnIndex];

          // Special handling for specific fields
          if (field === 'amount') {
            const cleanValue = String(value).replace(/[^\d.-]/g, '');
            value = parseFloat(cleanValue);
            if (isNaN(value)) {
              validationErrors.push(`Row ${i + 2}: Invalid amount value`);
              continue;
            }
          } else if (field === 'due_date' || field === 'payment_date') {
            const parts = String(value).split('/');
            if (parts.length === 3) {
              value = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          }

          transaction[field] = value;
        }
      }

      // Set defaults for required fields
      if (!transaction.status) {
        transaction.status = 'Pendente';
      }
      if (!transaction.type) {
        transaction.type = transaction.amount > 0 ? 'Receita' : 'Despesa';
      }

      // For Receita, auto-set status to Pago and handle dates
      if (transaction.type === 'Receita') {
        transaction.status = 'Pago';
        // Use due_date as payment_date for Receita
        if (transaction.due_date && !transaction.payment_date) {
          transaction.payment_date = transaction.due_date;
        }
        if (!transaction.payment_date) {
          transaction.payment_date = new Date().toISOString().split('T')[0];
        }
        transaction.due_date = null; // Clear due_date for Receita
      }

      // Skip if no description
      if (!transaction.description || transaction.description.trim() === '') {
        continue;
      }

      // Create external_id for this row
      const externalId = createExternalId(sheetId, i);
      transaction.external_id = externalId;

      // Priority 1: Check by external_id
      const existingByExtId = existingByExternalId.get(externalId);
      if (existingByExtId) {
        // Found by external_id - check ALL changes
        const changes = detectChanges(
          {
            description: existingByExtId.description,
            amount: Math.abs(Number(existingByExtId.amount)),
            due_date: existingByExtId.due_date,
            type: existingByExtId.type,
            status: existingByExtId.status,
          },
          { 
            description: transaction.description, 
            amount: Math.abs(transaction.amount), 
            due_date: transaction.due_date, 
            type: transaction.type, 
            status: transaction.status 
          }
        );

        if (Object.keys(changes).length > 0) {
          // Track what changed
          if (changes.description) changesDetected.description++;
          if (changes.amount) changesDetected.amount++;
          if (changes.status) changesDetected.status++;
          if (changes.due_date) changesDetected.due_date++;
          if (changes.type) changesDetected.type++;
          
          if (transaction.payment_date && transaction.type === 'Receita') {
            changes.payment_date = transaction.payment_date;
          }
          
          updatesToMake.push({ id: existingByExtId.id, changes });
        } else {
          skippedCount++;
        }
        continue;
      }

      // Priority 2: Check by hash (for legacy data without external_id)
      const hash = createTransactionHash(
        transaction.description, 
        Math.abs(transaction.amount), 
        transaction.due_date, 
        transaction.type
      );
      const existingByHashData = existingByHash.get(hash);
      
      if (existingByHashData) {
        // Found by hash - only update status and add external_id
        const changes: Record<string, any> = { external_id: externalId };
        if (existingByHashData.status !== transaction.status && transaction.type !== 'Receita') {
          changes.status = transaction.status;
          changesDetected.status++;
        }
        
        updatesToMake.push({ id: existingByHashData.id, changes });
        if (Object.keys(changes).length === 1) {
          skippedCount++;
        }
        continue;
      }

      // Priority 3: Validate and add new transaction
      try {
        const validated = transactionSchema.parse(transaction);
        newTransactions.push(validated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          validationErrors.push(`Row ${i + 2}: ${error.errors.map(e => e.message).join(', ')}`);
        }
      }
    }

    if (validationErrors.length > 0 && newTransactions.length === 0 && updatesToMake.length === 0) {
      console.warn('Validation errors:', validationErrors);
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed for some rows',
          validationErrors: validationErrors.slice(0, 10),
          totalErrors: validationErrors.length
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processing: ${newTransactions.length} new, ${updatesToMake.length} updates, ${skippedCount} skipped`);
    console.log(`Changes detected:`, changesDetected);

    // Insert new transactions
    let recordsInserted = 0;
    if (newTransactions.length > 0) {
      const { error: insertError, data: insertedData } = await supabase
        .from('transactions')
        .insert(newTransactions)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Falha ao importar transações. Verifique os dados e tente novamente.');
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
        records_inserted: recordsInserted,
        records_updated: recordsUpdated,
        records_skipped: skippedCount,
        status: 'success',
        sync_type: syncType,
      });

    console.log(`Sync completed: ${recordsInserted} inserted, ${recordsUpdated} updated, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recordsInserted,
        recordsUpdated,
        recordsSkipped: skippedCount,
        changesDetected,
        message: `${recordsInserted} novas transações, ${recordsUpdated} atualizadas, ${skippedCount} ignoradas.`,
        validationErrors: validationErrors.length > 0 ? validationErrors.slice(0, 5) : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in sync-sheet:', error);
    // Check for known safe error messages that can be returned to client
    const safeMessages = [
      'Falha ao importar transações',
      'Rate limit exceeded',
      'Sheet exceeds maximum',
      'Validation failed'
    ];
    const errorMessage = error instanceof Error ? error.message : '';
    const isSafeMessage = safeMessages.some(msg => errorMessage.includes(msg));
    
    return new Response(
      JSON.stringify({ 
        error: 'Falha na sincronização', 
        details: isSafeMessage ? errorMessage : 'Erro interno. Tente novamente mais tarde.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
