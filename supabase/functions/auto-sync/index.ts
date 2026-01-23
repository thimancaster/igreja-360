import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Generic error response to prevent information leakage
const unauthorizedResponse = (origin: string | null) => new Response(
  JSON.stringify({ success: false, error: 'Unauthorized' }),
  { status: 401, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
);

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authentication: Validate secret key
  const autoSyncSecret = Deno.env.get('AUTO_SYNC_SECRET_KEY');
  if (!autoSyncSecret) {
    console.error('Auto-sync: AUTO_SYNC_SECRET_KEY not configured');
    return unauthorizedResponse(origin);
  }

  const authHeader = req.headers.get('Authorization');
  const providedToken = authHeader?.replace('Bearer ', '');
  
  if (!providedToken || providedToken !== autoSyncSecret) {
    console.warn('Auto-sync: Invalid or missing authorization token');
    return unauthorizedResponse(origin);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Parse request body to check for action
  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body or invalid JSON, continue with default behavior
  }

  // If action is update_overdue, just run the overdue check
  if (body.action === 'update_overdue') {
    console.log('Auto-sync: Running overdue transactions update...');
    try {
      const { data, error } = await supabase.rpc('check_and_update_overdue');
      
      if (error) {
        console.error('Auto-sync: Error updating overdue transactions:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Auto-sync: Overdue update completed:', data);
      return new Response(
        JSON.stringify({ success: true, ...data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Auto-sync: Fatal error updating overdue:', error);
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  console.log('Auto-sync: Starting automatic synchronization check...');

  try {
    // Get all churches with sync enabled
    const { data: churchSettings, error: settingsError } = await supabase
      .from('app_settings')
      .select('church_id, setting_key, setting_value')
      .in('setting_key', ['sync_enabled', 'sync_interval_hours', 'last_auto_sync']);

    if (settingsError) {
      console.error('Auto-sync: Error fetching settings:', settingsError);
      throw settingsError;
    }

    // Group settings by church
    const churchSettingsMap: Record<string, Record<string, string>> = {};
    churchSettings?.forEach(setting => {
      if (!churchSettingsMap[setting.church_id]) {
        churchSettingsMap[setting.church_id] = {};
      }
      churchSettingsMap[setting.church_id][setting.setting_key] = setting.setting_value;
    });

    const results: any[] = [];
    const now = new Date();

    for (const [churchId, settings] of Object.entries(churchSettingsMap)) {
      const syncEnabled = settings['sync_enabled'] === 'true';
      const intervalHours = parseInt(settings['sync_interval_hours'] || '6', 10);
      const lastAutoSync = settings['last_auto_sync'] ? new Date(settings['last_auto_sync']) : null;

      if (!syncEnabled) {
        console.log(`Auto-sync: Church ${churchId} has sync disabled, skipping`);
        continue;
      }

      // Check if enough time has passed since last sync
      if (lastAutoSync) {
        const hoursSinceLastSync = (now.getTime() - lastAutoSync.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSync < intervalHours) {
          console.log(`Auto-sync: Church ${churchId} - Only ${hoursSinceLastSync.toFixed(1)}h since last sync (interval: ${intervalHours}h), skipping`);
          continue;
        }
      }

      console.log(`Auto-sync: Processing church ${churchId}...`);

      // Get Google integrations
      const { data: googleIntegrations } = await supabase
        .from('google_integrations')
        .select('id, user_id')
        .eq('church_id', churchId);

      // Get public sheet integrations
      const { data: publicIntegrations } = await supabase
        .from('public_sheet_integrations')
        .select('id, user_id')
        .eq('church_id', churchId);

      let churchResult = { churchId, synced: 0, errors: 0 };

      // Sync Google integrations
      for (const integration of googleIntegrations || []) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/sync-sheet`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              integrationId: integration.id,
              syncType: 'automatic',
            }),
          });

          if (response.ok) {
            churchResult.synced++;
          } else {
            churchResult.errors++;
            console.error(`Auto-sync: Error syncing Google integration ${integration.id}`);
          }
        } catch (err) {
          churchResult.errors++;
          console.error(`Auto-sync: Exception syncing Google integration ${integration.id}:`, err);
        }
      }

      // Sync public sheet integrations
      for (const integration of publicIntegrations || []) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/sync-public-sheet`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              integrationId: integration.id,
              syncType: 'automatic',
            }),
          });

          if (response.ok) {
            churchResult.synced++;
          } else {
            churchResult.errors++;
            console.error(`Auto-sync: Error syncing public sheet integration ${integration.id}`);
          }
        } catch (err) {
          churchResult.errors++;
          console.error(`Auto-sync: Exception syncing public sheet integration ${integration.id}:`, err);
        }
      }

      // Update last_auto_sync
      await supabase
        .from('app_settings')
        .upsert({
          church_id: churchId,
          setting_key: 'last_auto_sync',
          setting_value: now.toISOString(),
        }, {
          onConflict: 'church_id,setting_key',
        });

      results.push(churchResult);
      console.log(`Auto-sync: Church ${churchId} completed - ${churchResult.synced} synced, ${churchResult.errors} errors`);
    }

    console.log('Auto-sync: Completed successfully', { processedChurches: results.length });

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto-sync: Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
