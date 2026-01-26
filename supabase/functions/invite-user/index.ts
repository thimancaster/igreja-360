import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isValidEmail, validateName, isValidUUID, isValidRole, isValidPassword } from "../_shared/validation.ts";
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from "../_shared/rate-limit.ts";

interface InviteRequest {
  email: string;
  fullName: string;
  role: string;
  churchId: string;
  directRegistration?: boolean;
  temporaryPassword?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

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

    // Rate limiting check
    const rateLimitResult = checkRateLimit(`invite-user:${caller.id}`, RATE_LIMITS.INVITE_USER);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Parse request body
    const { email, fullName, role, churchId, directRegistration, temporaryPassword }: InviteRequest = await req.json();

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize name
    const nameValidation = validateName(fullName);
    if (!nameValidation.valid) {
      return new Response(
        JSON.stringify({ error: nameValidation.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const sanitizedName = nameValidation.sanitized!;

    // Validate role
    if (!role || !isValidRole(role)) {
      return new Response(
        JSON.stringify({ error: "Perfil inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate churchId
    if (!churchId || !isValidUUID(churchId)) {
      return new Response(
        JSON.stringify({ error: "ID da igreja inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password for direct registration with complexity requirements
    if (directRegistration) {
      const passwordValidation = isValidPassword(temporaryPassword || '');
      if (!passwordValidation.valid) {
        return new Response(
          JSON.stringify({ error: passwordValidation.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email.trim().toLowerCase());

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
          full_name: sanitizedName 
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

    // Handle direct registration (create user without email confirmation)
    if (directRegistration && temporaryPassword) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: temporaryPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: sanitizedName,
        },
      });

      if (createError) {
        console.error("Error creating user directly:", createError);
        return new Response(
          JSON.stringify({ error: "Falha ao criar usuário. Por favor, tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!newUser?.user) {
        return new Response(
          JSON.stringify({ error: "Falha ao criar usuário" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update profile with church_id
      await supabaseAdmin
        .from("profiles")
        .update({ 
          church_id: churchId,
          full_name: sanitizedName 
        })
        .eq("id", newUser.user.id);

      // Update role if not default
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
          message: "Usuário cadastrado com sucesso!",
          userId: newUser.user.id,
          directRegistration: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user with invite (email confirmation required)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      {
        data: {
          full_name: sanitizedName,
        },
        redirectTo: `${Deno.env.get("APP_BASE_URL") || "https://igreja-360.lovable.app"}/auth`,
      }
    );

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: "Falha ao criar usuário. Por favor, tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newUser?.user) {
      return new Response(
        JSON.stringify({ error: "Falha ao criar usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with church_id
    await supabaseAdmin
      .from("profiles")
      .update({ 
        church_id: churchId,
        full_name: sanitizedName 
      })
      .eq("id", newUser.user.id);

    // Update role if not default
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
    return new Response(
      JSON.stringify({ error: "Ocorreu um erro inesperado. Por favor, tente novamente." }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" } }
    );
  }
});
