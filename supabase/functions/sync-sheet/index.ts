import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema for transaction data
const transactionSchema = z.object({
  church_id: z.string().uuid(),
  created_by: z.string().uuid(),
  origin: z.string().max(100),
  description: z.string().max(500).trim(),
  amount: z.number().finite().safe(),
  type: z.enum(['Receita', 'Despesa']),
  status: z.enum(['Pendente', 'Pago', 'Vencido']),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  ministry_id: z.string().uuid().nullable().optional(),
});

const RATE_LIMIT_MINUTES = 5;
const MAX_ROWS_PER_SYNC = 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integrationId } = await req.json();
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
    const googleApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');

    if (!googleApiKey) {
      console.error('GOOGLE_SHEETS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
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

    if (!integration.sheet_url) {
      return new Response(
        JSON.stringify({ error: 'Sheet URL not found for this integration.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Starting sync for integration ${integrationId} by user ${user.id}`);

    // Extract sheet_id from sheet_url
    const sheetIdMatch = integration.sheet_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : null;

    if (!sheetId) {
      return new Response(
        JSON.stringify({ error: 'Could not extract Sheet ID from the provided URL.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get spreadsheet data using Google Sheets API Key
    const sheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:ZZ?key=${googleApiKey}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

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

    // Transform and validate data rows
    const transactions = [];
    const validationErrors = [];
    
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

      // Validate transaction
      try {
        const validated = transactionSchema.parse(transaction);
        transactions.push(validated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          validationErrors.push(`Row ${i + 2}: ${error.errors.map(e => e.message).join(', ')}`);
        }
      }
    }

    if (validationErrors.length > 0) {
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

    console.log(`Validated ${transactions.length} transactions for import`);

    // Insert transactions
    const { error: insertError } = await supabase
      .from('transactions')
      .insert(transactions);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to insert transactions: ${insertError.message}`);
    }

    // Update last sync time
    await supabase
      .from('google_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integrationId);

    console.log(`Sync completed: ${transactions.length} records imported`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recordsImported: transactions.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in sync-sheet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Sync operation failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
