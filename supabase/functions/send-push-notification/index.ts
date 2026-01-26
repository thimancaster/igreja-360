import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sanitizeText, isValidUUID } from "../_shared/validation.ts";
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from "../_shared/rate-limit.ts";

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
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify caller has admin or tesoureiro role
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasPermission = roles?.some(r => r.role === "admin" || r.role === "tesoureiro");
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get caller's church
    const { data: callerProfile } = await supabaseClient
      .from("profiles")
      .select("church_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.church_id) {
      return new Response(
        JSON.stringify({ error: "User not associated with a church" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting check (per church to prevent notification spam)
    const rateLimitResult = checkRateLimit(
      `push-notification:${callerProfile.church_id}`, 
      RATE_LIMITS.PUSH_NOTIFICATION
    );
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { user_id, church_id, payload }: SendPushRequest = await req.json();

    // Validate and sanitize payload
    if (!payload?.title || !payload?.body) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: title and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize title and body to prevent XSS
    const sanitizedPayload: PushNotificationPayload = {
      title: sanitizeText(payload.title).substring(0, 100),
      body: sanitizeText(payload.body).substring(0, 500),
      url: payload.url ? sanitizeText(payload.url) : undefined,
      actions: payload.actions?.map(a => ({
        action: sanitizeText(a.action).substring(0, 50),
        title: sanitizeText(a.title).substring(0, 50),
      })),
    };

    // Validate user_id format if provided
    if (user_id && !isValidUUID(user_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid user_id format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify caller can only send to their own church
    if (church_id && church_id !== callerProfile.church_id) {
      return new Response(
        JSON.stringify({ error: "Cannot send notifications to other churches" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If targeting a specific user, verify they belong to caller's church
    if (user_id) {
      const { data: targetProfile } = await supabaseClient
        .from("profiles")
        .select("church_id")
        .eq("id", user_id)
        .single();

      if (targetProfile?.church_id !== callerProfile.church_id) {
        return new Response(
          JSON.stringify({ error: "Target user is not in your church" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Build query for subscriptions (restricted to caller's church)
    let query = supabaseClient
      .from("push_subscriptions")
      .select("*")
      .eq("church_id", callerProfile.church_id);
    
    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error("Failed to fetch subscriptions:", fetchError);
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

    console.log(`Would send push to ${subscriptions.length} subscriptions:`, sanitizedPayload);

    return new Response(
      JSON.stringify({ message: "Push notifications queued", sent: subscriptions.length, payload: sanitizedPayload }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(req.headers.get("origin")) } }
    );
  }
};

serve(handler);
