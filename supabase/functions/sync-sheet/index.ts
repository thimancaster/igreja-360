import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      console.warn(`Unauthorized sync attempt: user ${user.id} tried to sync integration ${integrationId} owned by ${integration.user_id}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not own this integration' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Starting sync for sheet: ${integration.sheet_name}`);

    // Get spreadsheet data
    const sheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${integration.sheet_id}/values/A1:ZZ`,
      {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
        },
      }
    );

    if (!sheetResponse.ok) {
      const errorData = await sheetResponse.text();
      throw new Error(`Failed to fetch sheet data: ${errorData}`);
    }

    const sheetData = await sheetResponse.json();
    const rows = sheetData.values || [];

    if (rows.length === 0) {
      throw new Error('Sheet is empty');
    }

    // First row contains headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    const mapping = integration.column_mapping;

    // Transform data rows to transactions
    const transactions = [];
    for (const row of dataRows) {
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
            // Remove currency symbols and convert to number
            value = parseFloat(value.replace(/[^\d.-]/g, ''));
          } else if (field === 'due_date' || field === 'payment_date') {
            // Convert date formats (assuming DD/MM/YYYY)
            const parts = value.split('/');
            if (parts.length === 3) {
              value = `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert to YYYY-MM-DD
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

      transactions.push(transaction);
    }

    console.log(`Prepared ${transactions.length} transactions for import`);

    // Insert transactions (using upsert if needed)
    const { error: insertError } = await supabase
      .from('transactions')
      .insert(transactions);

    if (insertError) {
      throw new Error(`Failed to insert transactions: ${insertError.message}`);
    }

    // Update last sync time
    await supabase
      .from('google_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integrationId);

    console.log('Sync completed successfully');

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
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});