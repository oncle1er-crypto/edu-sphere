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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token, password, action } = await req.json();
    if (!token || typeof token !== "string") throw new Error("Token manquant");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    const tokenHash = await sha256Hex(token);

    // Étape 1 : vérification (action = "verify")
    if (action === "verify") {
      const { data: invs } = await admin
        .from("teacher_invitations")
        .select("id, expires_at, consumed_at, email, enseignant_id, ecole_id")
        .eq("token_hash", tokenHash).limit(1);
      const inv = invs?.[0];
      if (!inv) return new Response(JSON.stringify({ ok: false, reason: "not_found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (inv.consumed_at) return new Response(JSON.stringify({ ok: false, reason: "already_used" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (new Date(inv.expires_at) < new Date()) return new Response(JSON.stringify({ ok: false, reason: "expired" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Récupérer le nom enseignant
      const { data: ens } = await admin.from("enseignants").select("nom, prenom").eq("id", inv.enseignant_id).single();
      return new Response(JSON.stringify({ ok: true, email: inv.email, name: ens ? `${ens.prenom} ${ens.nom}` : null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Étape 2 : consommation + définition mot de passe
    if (!password || typeof password !== "string" || password.length < 8) {
      throw new Error("Mot de passe trop court (8 caractères min.)");
    }

    const { data: result, error: rpcErr } = await admin.rpc("consume_teacher_invitation", { _token_hash: tokenHash });
    if (rpcErr) throw rpcErr;
    const r = result as any;
    if (!r?.ok) {
      return new Response(JSON.stringify({ ok: false, reason: r?.reason ?? "invalid" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mettre à jour le mot de passe via admin API
    const { error: updErr } = await admin.auth.admin.updateUserById(r.user_id, { password });
    if (updErr) throw new Error("Mot de passe: " + updErr.message);

    return new Response(JSON.stringify({ ok: true, email: r.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message ?? "Erreur" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
