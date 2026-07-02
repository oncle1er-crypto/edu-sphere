import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, new_password } = await req.json();
    if (!email || !new_password || String(new_password).length < 6) {
      return new Response(JSON.stringify({ error: "email et new_password (>=6) requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth : soit token bootstrap admin (header x-bootstrap-token), soit JWT d'un admin
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
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userRes.user.id);
      authorized = (roles ?? []).some((r: any) => r.role === "admin");
      if (!authorized) {
        return new Response(JSON.stringify({ error: "Rôle admin requis" }), {
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
