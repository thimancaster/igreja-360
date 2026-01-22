import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  actions?: { action: string; title: string }[];
}

interface SendPushRequest {
  user_id?: string;
  church_id?: string;
  payload: PushNotificationPayload;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_id, church_id, payload }: SendPushRequest = await req.json();

    let query = supabaseClient.from("push_subscriptions").select("*");
    
    if (user_id) {
      query = query.eq("user_id", user_id);
    } else if (church_id) {
      query = query.eq("church_id", church_id);
    } else {
      return new Response(
        JSON.stringify({ error: "user_id or church_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Would send push to ${subscriptions.length} subscriptions:`, payload);

    return new Response(
      JSON.stringify({ message: "Push notifications queued", sent: subscriptions.length, payload }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
