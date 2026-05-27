import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
    const code: string = String(body.code ?? "").trim();
    const purpose: "enroll" | "challenge" = body.purpose === "challenge" ? "challenge" : "enroll";
    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Code invalide." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const code_hash = await sha256(code);
    const { data: ok, error } = await service.rpc("consume_sms_otp", {
      _user_id: user.id, _code_hash: code_hash, _purpose: purpose,
    });
    if (error) throw error;

    if (!ok) {
      await service.rpc("log_security_event", {
        _event_type: "mfa_sms_otp_failed", _severity: "warning",
        _ecole_id: null, _ip: null,
        _user_agent: req.headers.get("user-agent"), _device_fp: null,
        _metadata: { purpose },
      });
      return new Response(JSON.stringify({ ok: false, error: "Code invalide ou expiré." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (purpose === "enroll") {
      const { data: otp } = await service
        .from("mfa_sms_otp_codes").select("phone")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: role } = await service
        .from("user_roles").select("ecole_id").eq("user_id", user.id).limit(1).maybeSingle();
      // Numéro vérifié, mais facteur PAS encore actif comme MFA.
      // L'utilisateur devra confirmer explicitement via activate-mfa-sms.
      const nowIso = new Date().toISOString();
      await service.from("mfa_sms_factors").upsert({
        user_id: user.id, phone: otp?.phone ?? "", ecole_id: role?.ecole_id ?? null,
        verified: true, is_active: false,
        phone_verified_at: nowIso,
        friendly_name: "SMS",
        updated_at: nowIso,
      }, { onConflict: "user_id" });
    } else {
      await service.from("mfa_sms_factors")
        .update({ last_used_at: new Date().toISOString() }).eq("user_id", user.id);
    }


    await service.rpc("log_security_event", {
      _event_type: purpose === "enroll" ? "mfa_sms_phone_verified" : "mfa_sms_challenge_passed",
      _severity: "info", _ecole_id: null, _ip: null,
      _user_agent: req.headers.get("user-agent"), _device_fp: null, _metadata: {},
    });


    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
