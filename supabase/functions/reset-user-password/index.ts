import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

interface ResetPasswordRequest {
  userId: string;
  newPassword: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Parse request body
    const { userId, newPassword }: ResetPasswordRequest = await req.json();

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId and newPassword" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter no mínimo 8 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent admin from resetting their own password through this method
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: "Você não pode alterar sua própria senha por este método" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Error updating user password:", updateError);
      return new Response(
        JSON.stringify({ error: "Falha ao atualizar senha. Por favor, tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user email for audit log and notification
    const { data: targetUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const targetEmail = targetUserData?.user?.email || 'Unknown';

    // Get caller profile info for audit log
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, church_id")
      .eq("id", caller.id)
      .single();

    // Get church name for email
    let churchName = "sua organização";
    if (callerProfile?.church_id) {
      const { data: church } = await supabaseAdmin
        .from("churches")
        .select("name")
        .eq("id", callerProfile.church_id)
        .single();
      if (church?.name) {
        churchName = church.name;
      }
    }

    // Send email notification to user
    if (targetEmail && targetEmail !== 'Unknown') {
      try {
        await resend.emails.send({
          from: "Igreja 360 <noreply@resend.dev>",
          to: [targetEmail],
          subject: "Sua senha foi alterada",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
                Alerta de Segurança
              </h1>
              <p style="font-size: 16px; color: #555;">
                Olá,
              </p>
              <p style="font-size: 16px; color: #555;">
                Sua senha foi redefinida por um administrador de <strong>${churchName}</strong>.
              </p>
              <div style="background-color: #f8f9fa; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #333;">
                  <strong>Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                </p>
                <p style="margin: 10px 0 0 0; color: #333;">
                  <strong>Alterado por:</strong> ${callerProfile?.full_name || caller.email}
                </p>
              </div>
              <p style="font-size: 16px; color: #555;">
                Se você não solicitou esta alteração ou não reconhece esta atividade, entre em contato 
                imediatamente com o administrador da sua organização.
              </p>
              <p style="font-size: 14px; color: #888; margin-top: 30px;">
                Este é um email automático. Por favor, não responda.
              </p>
            </div>
          `,
        });
        console.log("Email notification sent to:", targetEmail);
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
        // Don't fail the request if email fails
      }
    }

    // Log the password reset action to audit_logs
    if (callerProfile?.church_id) {
      await supabaseAdmin.from("audit_logs").insert({
        church_id: callerProfile.church_id,
        user_id: caller.id,
        user_name: callerProfile.full_name || caller.email,
        action: "password_reset",
        entity_type: "user",
        details: {
          target_user_id: userId,
          target_user_email: targetEmail,
          reset_by: caller.email,
          notification_sent: targetEmail !== 'Unknown',
        },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Senha atualizada com sucesso!",
        emailSent: targetEmail !== 'Unknown',
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in reset-user-password function:", error);
    return new Response(
      JSON.stringify({ error: "Ocorreu um erro inesperado. Por favor, tente novamente." }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" } }
    );
  }
});
