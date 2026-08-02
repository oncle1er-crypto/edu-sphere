import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { normalizePhoneCI } from "../_shared/phone-ci.ts";
import { zinduaSend, ZINDUA_CONFIG_ERRORS } from "../_shared/zindua-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

function maskPhone(p: string): string {
  return p.slice(0, -4).replace(/./g, "*") + p.slice(-4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Non autorisé" }, 401);

    const body = await req.json();
    const purpose: "enroll" | "challenge" = body.purpose === "challenge" ? "challenge" : "enroll";
    let phone: string | null = body.phone ?? null;
    let ecole_id: string | null = body.ecole_id ?? null;

    if (purpose === "challenge") {
      const { data: factor } = await service
        .from("mfa_sms_factors").select("phone, ecole_id, verified")
        .eq("user_id", user.id).maybeSingle();
      if (!factor?.verified) {
        return json({ error: "Aucun facteur SMS vérifié." }, 400);
      }
      phone = factor.phone;
      ecole_id = factor.ecole_id;
    }

    if (!phone || !/^\+?\d{8,15}$/.test(phone.replace(/\s/g, ""))) {
      return json({ error: "Numéro de téléphone invalide." }, 400);
    }
    phone = phone.replace(/\s/g, "");

    if (!ecole_id) {
      const { data: role } = await service
        .from("user_roles").select("ecole_id").eq("user_id", user.id).limit(1).maybeSingle();
      ecole_id = role?.ecole_id ?? null;
    }
    if (!ecole_id) {
      return json({ error: "École introuvable pour l'utilisateur." }, 400);
    }

    // Rate-limit: max 1 envoi / 60s
    const { data: recent } = await service
      .from("mfa_sms_otp_codes").select("created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
      return json({ error: "Veuillez patienter avant de redemander un code." }, 429);
    }

    const code = generateOtp();
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error: insErr } = await service.from("mfa_sms_otp_codes").insert({
      user_id: user.id, phone, code_hash, purpose, expires_at,
    });
    if (insErr) throw insErr;

    // --- Normalisation E.164 (Côte d'Ivoire) ---
    const normalized = normalizePhoneCI(phone);
    if (!normalized) {
      return json({ error: "Numéro de téléphone invalide." }, 400);
    }
    const e164 = normalized.e164;

    const idempotencyKey =
      `mfa-${user.id}-${purpose}-${Math.floor(Date.now() / 1000)}`;

    /** Insère un log SMS. Retourne "conflit" si la clé d'idempotence existe déjà. */
    const logSms = async (row: Record<string, unknown>): Promise<"ok" | "conflit"> => {
      const { error } = await service.from("sms_logs").insert(row);
      if (error) {
        if (error.code === "23505") return "conflit";
        console.error("sms_logs insert error:", error.message);
      }
      return "ok";
    };

    // ---------- Tentative canal WhatsApp (Zindua) ----------
    let zinduaSent = false;
    let zinduaFallback = true;

    try {
      const { data: verif, error: verifErr } = await service.rpc("zindua_verifier_envoi", {
        _ecole_id: ecole_id,
        _destinataire: e164,
      });
      if (verifErr) throw verifErr;

      const v = (verif ?? {}) as Record<string, unknown>;
      if (v.autorise === true) {
        const templateSlug = String(v.template_otp ?? "otp-verification");
        const apiBaseUrl = String(v.api_base_url ?? "https://zindua.run/api/v1");

        const result = await zinduaSend({
          apiBaseUrl,
          to: e164,
          channel: "whatsapp",
          template: templateSlug,
          lang: "fr",
          variables: { code, otp: code },
        });

        const conflict = await logSms({
          ecole_id,
          destinataire: e164,
          message: "OTP MFA (contenu masqué)",
          sender_id: null,
          statut: result.ok ? "envoye" : "echec",
          provider: "zindua",
          canal: "whatsapp",
          template_slug: templateSlug,
          provider_log_id: result.ok ? (result.logId ?? null) : null,
          idempotency_key: idempotencyKey,
          error_code: result.ok ? null : result.code,
          provider_response: result.ok
            ? { log_id: result.logId ?? null }
            : { error_code: result.code },
          cout: 0,
          envoye_par: user.id,
        });

        // Envoi déjà journalisé pour cette seconde : ne pas renvoyer de message.
        if (conflict === "conflit") {
          return json({ ok: true, expires_at, canal: "whatsapp", provider: "zindua" }, 200);
        }

        if (result.ok) {
          zinduaSent = true;
          zinduaFallback = false;
        } else if (!result.permanent && !ZINDUA_CONFIG_ERRORS.has(result.code)) {
          // Erreur temporaire : on tente quand même le repli SMS.
          zinduaFallback = true;
        }
      }
    } catch (e) {
      // Une panne du canal de notification ne doit jamais bloquer l'utilisateur.
      console.error("Zindua channel error:", e instanceof Error ? e.message : String(e));
    }

    // ---------- Repli YellikaSMS (comportement historique) ----------
    if (!zinduaSent && zinduaFallback) {
      const { data: cfg, error: cfgErr } = await service
        .from("sms_config").select("*").eq("ecole_id", ecole_id).single();
      if (cfgErr || !cfg?.is_active || !cfg?.api_token) {
        return json({ error: "Configuration SMS indisponible pour votre école." }, 503);
      }

      const message = normalizeSms(
        `GSP - Code de verification: ${code}. Valide 10 minutes. Ne le partagez avec personne.`
      );

      // SSRF protection: allowlist SMS provider hosts
      const ALLOWED_SMS_HOSTS = new Set([
        "panel.yellikasms.com",
        "api.yellikasms.com",
        "yellikasms.com",
      ]);
      let smsUrl: URL;
      try {
        smsUrl = new URL(cfg.base_url);
      } catch {
        return json({ error: "URL SMS invalide." }, 400);
      }
      if (smsUrl.protocol !== "https:" || !ALLOWED_SMS_HOSTS.has(smsUrl.hostname)) {
        return json({ error: "Endpoint SMS non autorisé." }, 400);
      }

      const resp = await fetch(smsUrl.toString(), {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cfg.api_token}`,
        },
        body: JSON.stringify({ recipient: phone, sender_id: cfg.sender_id, message }),
      });
      const provider = await resp.json().catch(() => ({})) as Record<string, unknown>;
      const providerFailed = !resp.ok || provider?.status === "error";
      const providerMsg = typeof provider?.message === "string" ? provider.message : null;

      await service.from("sms_logs").insert({
        ecole_id, destinataire: phone, message: "[MFA OTP masqué]",
        sender_id: cfg.sender_id, statut: providerFailed ? "echoue" : "envoye",
        provider_response: provider, cout: cfg.cout_unitaire ?? 0, envoye_par: user.id,
      });

      if (providerFailed) {
        console.error("YellikaSMS failure:", providerMsg ?? resp.status);
        return json({
          error: providerMsg
            ? `Échec d'envoi du SMS : ${providerMsg}`
            : "Échec d'envoi du SMS.",
        }, 502);
      }
    }

    await service.rpc("log_security_event", {
      _event_type: purpose === "enroll" ? "mfa_sms_otp_sent_enroll" : "mfa_sms_otp_sent_challenge",
      _severity: "info", _ecole_id: ecole_id, _ip: null,
      _user_agent: req.headers.get("user-agent"), _device_fp: null,
      _metadata: { phone_masked: maskPhone(e164), canal: zinduaSent ? "whatsapp" : "sms" },
    });

    return json({
      ok: true,
      expires_at,
      canal: zinduaSent ? "whatsapp" : "sms",
      provider: zinduaSent ? "zindua" : "yellikasms",
    }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
