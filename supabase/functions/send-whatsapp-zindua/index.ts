import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { normalizePhoneCI } from "../_shared/phone-ci.ts";
import { zinduaSend, zinduaListTemplates, ZINDUA_CONFIG_ERRORS } from "../_shared/zindua-client.ts";

type Usage = "test" | "relance" | "echeance" | "bulletin" | "otp" | "recu";

interface Cible {
  to: string;
  variables?: Record<string, string>;
  /** Texte SMS utilisé si le repli SMS est activé. */
  sms?: string;
}

interface Payload {
  ecole_id: string;
  /** "lister_modeles" = diagnostic : renvoie les modèles disponibles chez Zindua. */
  action?: "envoyer" | "lister_modeles";
  usage?: Usage;
  /** Modèle Zindua imposé (sinon celui configuré pour l'usage). */
  template?: string;
  destinataires?: (string | Cible)[];
  /** Variables communes à tous les destinataires. */
  variables?: Record<string, string>;
  /** Texte SMS commun pour le repli. */
  sms?: string;
  fallback_sms?: boolean;
}

const USAGES: Usage[] = ["test", "relance", "echeance", "bulletin", "otp", "recu"];
const MAX_DESTINATAIRES = 10;
const ALLOWED_SMS_HOSTS = new Set([
  "panel.yellikasms.com",
  "api.yellikasms.com",
  "yellikasms.com",
]);

/** Traductions françaises des refus renvoyés par zindua_verifier_envoi. */
const RAISONS: Record<string, string> = {
  config_absente: "Aucune configuration Zindua pour cette école.",
  zindua_desactive: "Zindua est désactivé dans les paramètres de notifications.",
  canal_whatsapp_desactive: "Le canal WhatsApp est désactivé dans les paramètres.",
  destinataire_non_autorise_en_test:
    "Mode test actif : ce numéro n'est pas dans la liste des destinataires de test.",
  quota_mensuel_atteint: "Quota mensuel WhatsApp atteint.",
  cadence_trop_rapide: "Cadence trop rapide : patientez quelques secondes.",
};

/** Traductions françaises des codes d'erreur du fournisseur. */
const CODES: Record<string, string> = {
  WHATSAPP_NOT_CONNECTED: "Le compte WhatsApp n'est pas connecté chez Zindua.",
  TEMPLATE_NOT_FOUND: "Le modèle de message est introuvable chez Zindua.",
  QUOTA_EXCEEDED: "Quota Zindua dépassé.",
  INVALID_PHONE: "Numéro de téléphone refusé par Zindua.",
  INVALID_EMAIL: "Adresse e-mail refusée par Zindua.",
  EMAIL_SERVICE_NOT_CONFIGURED: "Le service e-mail n'est pas configuré chez Zindua.",
  CLE_API_ABSENTE: "La clé API Zindua n'est pas configurée côté serveur.",
  URL_API_INVALIDE: "L'URL de l'API Zindua est invalide.",
  RATE_LIMITED: "Zindua limite temporairement les envois. Réessayez dans un instant.",
  PROVIDER_ERROR: "Zindua est momentanément indisponible.",
  TIMEOUT: "Zindua n'a pas répondu à temps.",
  ERREUR_RESEAU: "Impossible de joindre Zindua (réseau).",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normaliserSms(m: string): string {
  return m.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Non autorisé" });

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json(401, { error: "Non autorisé" });

    const body = (await req.json()) as Payload;
    const ecole_id = body?.ecole_id;
    const usage: Usage = USAGES.includes(body?.usage as Usage) ? (body.usage as Usage) : "relance";
    const brut = Array.isArray(body?.destinataires) ? body.destinataires : [];

    const action = body?.action === "lister_modeles" ? "lister_modeles" : "envoyer";

    if (!ecole_id) return json(400, { error: "Champ requis : ecole_id." });
    if (action === "envoyer" && brut.length === 0) {
      return json(400, { error: "Champs requis : ecole_id et destinataires." });
    }
    if (brut.length > MAX_DESTINATAIRES) {
      return json(400, {
        error: `Maximum ${MAX_DESTINATAIRES} destinataires par envoi (cadence WhatsApp imposée par Zindua).`,
      });
    }

    // Contrôle d'appartenance à l'école
    const { data: membership } = await service
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("ecole_id", ecole_id)
      .in("role", ["admin", "directeur", "comptable", "secretaire", "surveillant"] as never)
      .maybeSingle();
    if (!membership) return json(403, { error: "Accès refusé pour cette école." });

    if (action === "lister_modeles") {
      const { data: cfg } = await service
        .from("zindua_config")
        .select("api_base_url")
        .eq("ecole_id", ecole_id)
        .maybeSingle();
      const res = await zinduaListTemplates(
        (cfg?.api_base_url as string | undefined) ?? "https://zindua.run/api/v1",
      );
      if (!res.ok) {
        return json(200, {
          ok: false,
          detail: CODES[res.code] ??
            "Impossible de récupérer la liste des modèles chez Zindua (endpoint non exposé par l'API).",
          essais: res.essais,
        });
      }
      return json(200, { ok: true, endpoint: res.endpoint, templates: res.templates });
    }

    const cibles: Cible[] = brut.map((d) =>
      typeof d === "string" ? { to: d } : { to: d.to, variables: d.variables, sms: d.sms }
    );

    // Configuration SMS chargée une seule fois (repli éventuel)
    let smsCfg: Record<string, unknown> | null = null;
    if (body.fallback_sms) {
      const { data } = await service.from("sms_config").select("*").eq("ecole_id", ecole_id).maybeSingle();
      smsCfg = data as Record<string, unknown> | null;
    }

    const envoyerSms = async (to: string, texte: string) => {
      if (!smsCfg?.is_active || !smsCfg?.api_token) {
        return { ok: false, detail: "Configuration SMS indisponible." };
      }
      let smsUrl: URL;
      try {
        smsUrl = new URL(String(smsCfg.base_url));
      } catch {
        return { ok: false, detail: "URL SMS invalide." };
      }
      if (smsUrl.protocol !== "https:" || !ALLOWED_SMS_HOSTS.has(smsUrl.hostname)) {
        return { ok: false, detail: "Endpoint SMS non autorisé." };
      }
      const resp = await fetch(smsUrl.toString(), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${smsCfg.api_token}`,
        },
        body: JSON.stringify({
          recipient: to,
          sender_id: smsCfg.sender_id,
          message: normaliserSms(texte),
        }),
      });
      const prov = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
      const echec = !resp.ok || prov?.status === "error";
      await service.from("sms_logs").insert({
        ecole_id,
        destinataire: to,
        message: normaliserSms(texte),
        sender_id: smsCfg.sender_id ?? null,
        statut: echec ? "echoue" : "envoye",
        provider: "yellikasms",
        canal: "sms",
        provider_response: prov,
        cout: (smsCfg.cout_unitaire as number) ?? 0,
        envoye_par: user.id,
      });
      return {
        ok: !echec,
        detail: echec
          ? typeof prov?.message === "string" ? prov.message : "Échec de l'envoi du SMS."
          : undefined,
      };
    };

    const resultats: {
      destinataire: string;
      canal: "whatsapp" | "sms" | null;
      ok: boolean;
      detail?: string;
      code?: string;
    }[] = [];

    let cadence = 15;
    for (let i = 0; i < cibles.length; i++) {
      const cible = cibles[i];
      const norm = normalizePhoneCI(cible.to);
      if (!norm) {
        resultats.push({
          destinataire: cible.to,
          canal: null,
          ok: false,
          detail: "Numéro invalide (format ivoirien attendu).",
        });
        continue;
      }
      const to = norm.e164;
      const texteSms = cible.sms ?? body.sms ?? null;

      if (i > 0) await sleep(cadence * 1000 + 500);

      const { data: verif, error: verifErr } = await service.rpc("zindua_verifier_envoi", {
        _ecole_id: ecole_id,
        _destinataire: to,
        _usage: usage,
      });

      const v = (verif ?? {}) as Record<string, unknown>;
      if (verifErr || v.autorise !== true) {
        const raison = String(v.raison ?? "verification_impossible");
        const detail = RAISONS[raison] ?? verifErr?.message ?? "Envoi WhatsApp non autorisé.";
        if (body.fallback_sms && texteSms) {
          const r = await envoyerSms(to, texteSms);
          resultats.push({
            destinataire: to,
            canal: "sms",
            ok: r.ok,
            detail: r.ok ? `WhatsApp indisponible (${detail}) — SMS envoyé.` : r.detail,
            code: raison,
          });
        } else {
          resultats.push({ destinataire: to, canal: null, ok: false, detail, code: raison });
        }
        continue;
      }

      const template = body.template?.trim() || String(v.template ?? v.template_otp ?? "");
      const apiBaseUrl = String(v.api_base_url ?? "https://zindua.run/api/v1");

      const res = await zinduaSend({
        apiBaseUrl,
        to,
        channel: "whatsapp",
        template,
        lang: "fr",
        variables: { ...(body.variables ?? {}), ...(cible.variables ?? {}) },
      });

      await service.from("sms_logs").insert({
        ecole_id,
        destinataire: to,
        message: `[whatsapp:${template}]`,
        sender_id: null,
        statut: res.ok ? "envoye" : "echoue",
        provider: "zindua",
        canal: "whatsapp",
        template_slug: template,
        provider_log_id: res.ok ? (res.logId ?? null) : null,
        error_code: res.ok ? null : res.code,
        provider_response: res.ok ? { log_id: res.logId ?? null } : { error_code: res.code },
        cout: 0,
        envoye_par: user.id,
      });

      if (res.ok) {
        resultats.push({ destinataire: to, canal: "whatsapp", ok: true });
        continue;
      }

      const detail = CODES[res.code] ?? `Échec WhatsApp (${res.code}).`;
      if (body.fallback_sms && texteSms && (res.permanent || ZINDUA_CONFIG_ERRORS.has(res.code))) {
        const r = await envoyerSms(to, texteSms);
        resultats.push({
          destinataire: to,
          canal: "sms",
          ok: r.ok,
          detail: r.ok ? `${detail} SMS envoyé à la place.` : r.detail,
          code: res.code,
        });
      } else {
        resultats.push({ destinataire: to, canal: null, ok: false, detail, code: res.code });
      }
      cadence = Math.max(cadence, 15);
    }

    const envoyes = resultats.filter((r) => r.ok).length;
    return json(200, {
      total: resultats.length,
      envoyes,
      echecs: resultats.length - envoyes,
      whatsapp: resultats.filter((r) => r.ok && r.canal === "whatsapp").length,
      sms: resultats.filter((r) => r.ok && r.canal === "sms").length,
      resultats,
    });
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : String(err) });
  }
});
