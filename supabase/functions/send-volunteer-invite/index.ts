import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { volunteer_id, email, volunteer_name, ministry_id } = await req.json();

    if (!volunteer_id || !email || !volunteer_name || !ministry_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: ministry } = await supabase
      .from("ministries")
      .select("name, churches(name)")
      .eq("id", ministry_id)
      .single();

    const ministryName = ministry?.name || "Ministério";
    const churchName = (ministry?.churches as any)?.name || "Igreja";

    if (RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Igreja360 <noreply@resend.dev>",
          to: [email],
          subject: `Você foi convidado para ser voluntário em ${ministryName}`,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #333;">Convite de Voluntariado</h1><p>Olá ${volunteer_name},</p><p>Você foi convidado para fazer parte da equipe de voluntários do ministério <strong>${ministryName}</strong> na igreja <strong>${churchName}</strong>.</p><p>Para aceitar o convite, acesse o sistema e revise o Termo de Compromisso de Voluntariado.</p><p style="margin-top: 30px;"><a href="https://igreja-360.lovable.app/app/voluntario/aceitar-termo" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Aceitar Convite</a></p></div>`,
        }),
      });

      if (!res.ok) {
        console.error("Resend API error:", await res.text());
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending volunteer invite:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
