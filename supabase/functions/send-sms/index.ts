import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface SmsRequest {
  ecole_id: string;
  destinataires: string[]; // phone numbers
  message: string;
}

function normalizeSmsMessage(message: string): string {
  return message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[œŒ]/g, "oe")
    .replace(/[æÆ]/g, "ae")
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x0A\x0D\x20-\x7E]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SmsRequest = await req.json();
    const { ecole_id, destinataires, message } = body;

    if (!ecole_id || !destinataires?.length || !message) {
      return new Response(JSON.stringify({ error: "Champs requis: ecole_id, destinataires, message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Verify caller belongs to the requested school ---
    const { data: membership, error: memErr } = await supabase
      .from("user_roles")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("ecole_id", ecole_id)
      .in("role", ["admin", "directeur", "comptable", "surveillant"] as any)
      .maybeSingle();
    if (memErr || !membership) {
      return new Response(JSON.stringify({ error: "Accès refusé pour cette école." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Cap abuse vectors ---
    if (destinataires.length > 500) {
      return new Response(JSON.stringify({ error: "Trop de destinataires (max 500)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length > 1000) {
      return new Response(JSON.stringify({ error: "Message trop long (max 1000 caractères)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedMessage = normalizeSmsMessage(message);
    if (!normalizedMessage) {
      return new Response(JSON.stringify({ error: "Message SMS invalide après normalisation." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get SMS config for this school
    const { data: config, error: configError } = await supabase
      .from("sms_config")
      .select("*")
      .eq("ecole_id", ecole_id)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "Configuration SMS non trouvée. Veuillez configurer YellikaSMS dans les paramètres." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!config.is_active) {
      return new Response(JSON.stringify({ error: "Le service SMS est désactivé." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!config.api_token) {
      return new Response(JSON.stringify({ error: "Clé API YellikaSMS non configurée." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- SSRF protection: allowlist YellikaSMS hosts ---
    const ALLOWED_SMS_HOSTS = new Set([
      "panel.yellikasms.com",
      "api.yellikasms.com",
      "yellikasms.com",
    ]);
    let smsUrl: URL;
    try {
      smsUrl = new URL(config.base_url);
    } catch {
      return new Response(JSON.stringify({ error: "URL SMS invalide." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (smsUrl.protocol !== "https:" || !ALLOWED_SMS_HOSTS.has(smsUrl.hostname)) {
      return new Response(JSON.stringify({ error: "Endpoint SMS non autorisé." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const results: { destinataire: string; success: boolean; response?: unknown }[] = [];

    for (const destinataire of destinataires) {
      try {
        const response = await fetch(config.base_url, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.api_token}`,
          },
          body: JSON.stringify({
            recipient: destinataire,
            sender_id: config.sender_id,
            message: normalizedMessage,
          }),
        });

        const data = await response.json();
        const success = response.ok;

        // Log
        await supabase.from("sms_logs").insert({
          ecole_id,
          destinataire,
          message: normalizedMessage,
          sender_id: config.sender_id,
          statut: success ? "envoye" : "echoue",
          provider_response: data,
          cout: config.cout_unitaire * Math.ceil(normalizedMessage.length / 160),
          envoye_par: user.id,
        });

        results.push({ destinataire, success, response: data });
      } catch (err) {
        await supabase.from("sms_logs").insert({
          ecole_id,
          destinataire,
          message: normalizedMessage,
          sender_id: config.sender_id,
          statut: "echoue",
          provider_response: { error: String(err) },
          cout: 0,
          envoye_par: user.id,
        });
        results.push({ destinataire, success: false, response: { error: String(err) } });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(JSON.stringify({ sent, failed, total: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
