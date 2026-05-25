import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface WhatsAppRequest {
  ecole_id: string;
  destinataires: string[];
  message?: string;
  template_name?: string;
  variables?: Record<string, string> | string[];
}

const ALLOWED_HOSTS = new Set([
  "panel.yellikasms.com",
  "api.yellikasms.com",
  "yellikasms.com",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Non autorisé" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json(401, { error: "Non autorisé" });

    const body = (await req.json()) as WhatsAppRequest;
    const { ecole_id, destinataires, message, template_name, variables } = body;

    if (!ecole_id || !destinataires?.length || (!message && !template_name)) {
      return json(400, { error: "Champs requis : ecole_id, destinataires, message ou template_name" });
    }
    if (destinataires.length > 500) return json(400, { error: "Trop de destinataires (max 500)." });
    if (message && message.length > 4096) return json(400, { error: "Message trop long (max 4096 caractères)." });

    // Verify school membership
    const { data: membership } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("ecole_id", ecole_id)
      .in("role", ["admin", "directeur", "comptable", "surveillant"] as any)
      .maybeSingle();
    if (!membership) return json(403, { error: "Accès refusé pour cette école." });

    // Load config
    const { data: config, error: configError } = await supabase
      .from("sms_config")
      .select("*")
      .eq("ecole_id", ecole_id)
      .single();

    if (configError || !config) {
      return json(404, { error: "Configuration WhatsApp non trouvée. Configurez YellikaSMS d'abord." });
    }
    if (!config.whatsapp_enabled) return json(400, { error: "Le service WhatsApp est désactivé." });
    if (!config.api_token) return json(400, { error: "Clé API YellikaSMS non configurée." });

    // SSRF protection
    let waUrl: URL;
    try {
      waUrl = new URL(config.whatsapp_url);
    } catch {
      return json(400, { error: "URL WhatsApp invalide." });
    }
    if (waUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(waUrl.hostname)) {
      return json(400, { error: "Endpoint WhatsApp non autorisé." });
    }

    const results: { destinataire: string; success: boolean; response?: unknown }[] = [];

    for (const destinataire of destinataires) {
      try {
        const payload: Record<string, unknown> = {
          recipient: destinataire,
          sender_id: config.sender_id,
        };
        if (template_name) {
          payload.type = "template";
          payload.template_name = template_name;
          if (variables) payload.variables = variables;
          if (message) payload.message = message;
        } else {
          payload.type = "text";
          payload.message = message;
        }

        const resp = await fetch(waUrl.toString(), {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.api_token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await resp.json().catch(() => ({}));
        // YellikaSMS returns { status: "success", ... } on success
        const success = resp.ok && (data?.status ? data.status === "success" : true);

        await supabase.from("sms_logs").insert({
          ecole_id,
          destinataire,
          message: message || `[template:${template_name}]`,
          sender_id: config.sender_id,
          statut: success ? "envoye" : "echoue",
          provider_response: data,
          cout: config.whatsapp_cout_unitaire || 0,
          envoye_par: user.id,
          canal: "whatsapp",
        });

        results.push({ destinataire, success, response: data });
      } catch (err) {
        await supabase.from("sms_logs").insert({
          ecole_id,
          destinataire,
          message: message || `[template:${template_name}]`,
          sender_id: config.sender_id,
          statut: "echoue",
          provider_response: { error: String(err) },
          cout: 0,
          envoye_par: user.id,
          canal: "whatsapp",
        });
        results.push({ destinataire, success: false, response: { error: String(err) } });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.length - sent;
    return json(200, { sent, failed, total: results.length, results });
  } catch (err) {
    return json(500, { error: String(err) });
  }
});
