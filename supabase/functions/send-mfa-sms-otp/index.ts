import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateOtp(): string {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const n = (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, "0");
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeSms(m: string): string {
  return m.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const purpose: "enroll" | "challenge" = body.purpose === "challenge" ? "challenge" : "enroll";
    let phone: string | null = body.phone ?? null;
    let ecole_id: string | null = body.ecole_id ?? null;

    if (purpose === "challenge") {
      const { data: factor } = await service
        .from("mfa_sms_factors").select("phone, ecole_id, verified")
        .eq("user_id", user.id).maybeSingle();
      if (!factor?.verified) {
        return new Response(JSON.stringify({ error: "Aucun facteur SMS vérifié." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      phone = factor.phone;
      ecole_id = factor.ecole_id;
    }

    if (!phone || !/^\+?\d{8,15}$/.test(phone.replace(/\s/g, ""))) {
      return new Response(JSON.stringify({ error: "Numéro de téléphone invalide." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    phone = phone.replace(/\s/g, "");

    if (!ecole_id) {
      const { data: role } = await service
        .from("user_roles").select("ecole_id").eq("user_id", user.id).limit(1).maybeSingle();
      ecole_id = role?.ecole_id ?? null;
    }
    if (!ecole_id) {
      return new Response(JSON.stringify({ error: "École introuvable pour l'utilisateur." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate-limit: max 1 envoi / 60s
    const { data: recent } = await service
      .from("mfa_sms_otp_codes").select("created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
      return new Response(JSON.stringify({ error: "Veuillez patienter avant de redemander un code." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = generateOtp();
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error: insErr } = await service.from("mfa_sms_otp_codes").insert({
      user_id: user.id, phone, code_hash, purpose, expires_at,
    });
    if (insErr) throw insErr;

    // Charger config SMS de l'école
    const { data: cfg, error: cfgErr } = await service
      .from("sms_config").select("*").eq("ecole_id", ecole_id).single();
    if (cfgErr || !cfg?.is_active || !cfg?.api_token) {
      return new Response(JSON.stringify({ error: "Configuration SMS indisponible pour votre école." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = normalizeSms(
      `GSP - Code de verification: ${code}. Valide 10 minutes. Ne le partagez avec personne.`
    );

    const resp = await fetch(cfg.base_url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.api_token}`,
      },
      body: JSON.stringify({ recipient: phone, sender_id: cfg.sender_id, message }),
    });
    const provider = await resp.json().catch(() => ({}));

    await service.from("sms_logs").insert({
      ecole_id, destinataire: phone, message: "[MFA OTP masqué]",
      sender_id: cfg.sender_id, statut: resp.ok ? "envoye" : "echoue",
      provider_response: provider, cout: cfg.cout_unitaire ?? 0, envoye_par: user.id,
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "Échec d'envoi du SMS." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await service.rpc("log_security_event", {
      _event_type: purpose === "enroll" ? "mfa_sms_otp_sent_enroll" : "mfa_sms_otp_sent_challenge",
      _severity: "info", _ecole_id: ecole_id, _ip: null,
      _user_agent: req.headers.get("user-agent"), _device_fp: null,
      _metadata: { phone_masked: phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4) },
    });

    return new Response(JSON.stringify({ ok: true, expires_at }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
