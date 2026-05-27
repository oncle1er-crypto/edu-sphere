import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { enseignant_id, app_base_url } = await req.json();
    if (!enseignant_id) {
      return new Response(JSON.stringify({ error: "enseignant_id requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Charger l'enseignant
    const { data: ens, error: ensErr } = await admin
      .from("enseignants")
      .select("id, nom, prenom, email, telephone, ecole_id, user_id")
      .eq("id", enseignant_id)
      .single();
    if (ensErr || !ens) throw new Error("Enseignant introuvable");
    if (!ens.email && !ens.telephone) throw new Error("Email ou téléphone requis pour créer le compte");

    // Vérifier admin école
    const { data: isAdmin } = await admin.rpc("has_permission" as any, {
      _user_id: user.id, _ecole_id: ens.ecole_id, _module: "parametres", _action: "create",
    });
    // Fallback : vérifier rôle admin directement
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("ecole_id", ens.ecole_id);
    const isEcoleAdmin = (roles ?? []).some((r: any) => r.role === "admin") || isAdmin === true;
    if (!isEcoleAdmin) {
      return new Response(JSON.stringify({ error: "Accès refusé : admin requis" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Créer ou récupérer user
    let userId = ens.user_id as string | null;
    if (!userId) {
      const tempPassword = randomToken(16);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: ens.email ?? `${enseignant_id}@no-email.local`,
        phone: ens.telephone ?? undefined,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${ens.prenom} ${ens.nom}`, role: "enseignant", enseignant_id },
      });
      if (createErr) throw new Error("Création compte: " + createErr.message);
      userId = created.user!.id;

      await admin.from("user_roles").insert({
        user_id: userId, ecole_id: ens.ecole_id, role: "enseignant",
      });
      await admin.from("enseignants").update({ user_id: userId }).eq("id", enseignant_id);
    }

    // Générer token invitation
    const token = randomToken(32);
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    await admin.from("teacher_invitations").insert({
      enseignant_id, ecole_id: ens.ecole_id, user_id: userId,
      token_hash: tokenHash, email: ens.email, telephone: ens.telephone,
      expires_at: expiresAt, created_by: user.id,
    });
    await admin.from("enseignants").update({ invitation_sent_at: new Date().toISOString() }).eq("id", enseignant_id);

    const baseUrl = (app_base_url || req.headers.get("origin") || "").replace(/\/$/, "");
    const inviteUrl = `${baseUrl}/invitation?token=${token}`;
    const message = `Bonjour ${ens.prenom}, votre compte enseignant a été créé. Définissez votre mot de passe : ${inviteUrl} (valide 7 jours).`;

    // Envoi SMS via fonction existante
    let smsOk = false;
    if (ens.telephone) {
      try {
        const sms = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ to: ens.telephone, message, ecole_id: ens.ecole_id }),
        });
        smsOk = sms.ok;
      } catch (_) { /* ignore */ }
    }

    // Envoi email (best-effort : si Lovable Emails configuré)
    let emailOk = false;
    if (ens.email) {
      try {
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "recovery", email: ens.email,
          options: { redirectTo: inviteUrl },
        });
        emailOk = !!linkData;
      } catch (_) { /* ignore */ }
    }

    await admin.rpc("log_security_event" as any, {
      _event_type: "teacher_account_invited", _severity: "info", _ecole_id: ens.ecole_id,
      _ip: null, _user_agent: null, _device_fp: null,
      _metadata: { enseignant_id, email_sent: emailOk, sms_sent: smsOk },
    });

    return new Response(JSON.stringify({
      ok: true, user_id: userId, invite_url: inviteUrl, sms_sent: smsOk, email_sent: emailOk,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
