import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface InviteRequest {
  email: string;
  fullName: string;
  role: string;
  churchId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user JWT to verify they're authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller has permission (admin or tesoureiro)
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller has admin or tesoureiro role
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const hasPermission = callerRoles?.some(r => r.role === "admin" || r.role === "tesoureiro");
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, fullName, role, churchId }: InviteRequest = await req.json();

    if (!email || !fullName || !role || !churchId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // User exists - check if already associated with a church
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("church_id")
        .eq("id", existingUser.id)
        .single();

      if (existingProfile?.church_id) {
        return new Response(
          JSON.stringify({ error: "Usuário já está associado a uma igreja" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update profile with church and name
      await supabaseAdmin
        .from("profiles")
        .update({ 
          church_id: churchId, 
          full_name: fullName 
        })
        .eq("id", existingUser.id);

      // Update role
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", existingUser.id);

      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: existingUser.id, role });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Usuário existente foi associado à igreja",
          userId: existingUser.id 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user with invite
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: fullName,
        },
        redirectTo: `${Deno.env.get("APP_BASE_URL") || "https://igreja-360.lovable.app"}/auth`,
      }
    );

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newUser?.user) {
      return new Response(
        JSON.stringify({ error: "Falha ao criar usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The handle_new_user trigger creates profile with default role
    // We need to update it with church_id and correct role
    
    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with church_id
    await supabaseAdmin
      .from("profiles")
      .update({ 
        church_id: churchId,
        full_name: fullName 
      })
      .eq("id", newUser.user.id);

    // Update role (replace default 'user' role with specified role)
    if (role !== "user") {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", newUser.user.id);

      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Convite enviado com sucesso!",
        userId: newUser.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in invite-user function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
