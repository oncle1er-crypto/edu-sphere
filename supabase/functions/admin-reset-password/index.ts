import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, new_password, ecole_id } = await req.json();
    if (!email || !new_password || String(new_password).length < 6 || !ecole_id) {
      return new Response(JSON.stringify({ error: "email, ecole_id et new_password (>=6) requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth : soit token bootstrap admin (header x-bootstrap-token), soit JWT d'un admin
    // de l'école ciblée (isolation multi-tenant).
    const bootstrap = req.headers.get("x-bootstrap-token");
    const bootstrapExpected = Deno.env.get("ADMIN_RESET_BOOTSTRAP_TOKEN");
    let authorized = !!bootstrap && !!bootstrapExpected && bootstrap === bootstrapExpected;

    if (!authorized) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const jwt = authHeader.replace("Bearer ", "");
      const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
      if (userErr || !userRes?.user) {
        return new Response(JSON.stringify({ error: "Non authentifié" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Doit être admin de l'école ciblée (pas admin "global")
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userRes.user.id)
        .eq("ecole_id", ecole_id);
      authorized = (roles ?? []).some((r: any) => r.role === "admin");
      if (!authorized) {
        return new Response(JSON.stringify({ error: "Rôle admin requis pour cette école" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Trouver l'utilisateur cible par email
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const target = list.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
    if (!target) {
      return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // La cible doit appartenir à l'école indiquée
    const { data: targetMembership } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", target.id)
      .eq("ecole_id", ecole_id)
      .limit(1)
      .maybeSingle();
    if (!targetMembership) {
      return new Response(JSON.stringify({ error: "Utilisateur cible hors de votre école" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(target.id, {
      password: new_password,
    });
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({ ok: true, user_id: target.id, email: target.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
