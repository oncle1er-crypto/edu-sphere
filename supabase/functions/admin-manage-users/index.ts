import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Domaine interne pour les comptes créés avec un numéro de téléphone.
// Doit rester en synchro avec src/lib/phoneAuth.ts (côté client).
const PHONE_EMAIL_DOMAIN = "phone.gsp.local";
const phoneToEmail = (phone: string) => `${phone}@${PHONE_EMAIL_DOMAIN}`;
const isValidPhone = (p: string) => /^\d{10}$/.test(p);
const randomTempPassword = () =>
  "Tmp" + Math.random().toString(36).slice(2, 8) + Math.floor(Math.random() * 90 + 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non authentifié" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const body = await req.json();
    const { action, ecole_id } = body ?? {};
    if (!action || !ecole_id) return json({ error: "action et ecole_id requis" }, 400);

    // Vérifier admin de l'école
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("ecole_id", ecole_id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "directeur");
    if (!isAdmin) return json({ error: "Accès refusé : admin ou directeur requis" }, 403);

    // ============= LIST =============
    if (action === "list") {
      const { data: schoolRoles } = await admin
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("ecole_id", ecole_id);

      const userIds = [...new Set((schoolRoles ?? []).map((r: any) => r.user_id))];
      if (userIds.length === 0) return json({ users: [] });

      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      const emailMap = new Map<string, { email: string | null; confirmed: boolean; created_at: string }>();
      let page = 1;
      const perPage = 200;
      for (let i = 0; i < 5; i++) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage });
        if (!list || list.users.length === 0) break;
        for (const u of list.users) {
          if (userIds.includes(u.id)) {
            emailMap.set(u.id, {
              email: u.email ?? null,
              confirmed: !!u.email_confirmed_at,
              created_at: u.created_at,
            });
          }
        }
        if (list.users.length < perPage) break;
        page++;
      }

      const userMap = new Map<string, any>();
      for (const r of schoolRoles ?? []) {
        const p = profileMap.get(r.user_id) as any;
        const authInfo = emailMap.get(r.user_id);
        const rawEmail = authInfo?.email ?? "";
        const isPhoneAcct = rawEmail.endsWith("@" + PHONE_EMAIL_DOMAIN);
        if (userMap.has(r.user_id)) {
          userMap.get(r.user_id).role += `, ${r.role}`;
        } else {
          userMap.set(r.user_id, {
            user_id: r.user_id,
            full_name: p?.full_name || "Utilisateur",
            email: isPhoneAcct ? "" : rawEmail,
            phone: p?.phone ?? (isPhoneAcct ? rawEmail.split("@")[0] : ""),
            email_confirmed: authInfo?.confirmed ?? false,
            role: r.role,
            created_at: r.created_at,
          });
        }
      }
      return json({ users: Array.from(userMap.values()) });
    }

    // ============= CREATE =============
    if (action === "create") {
      const { email, phone, password, full_name, roles: newRoles } = body;
      if (!full_name || !Array.isArray(newRoles) || newRoles.length === 0) {
        return json({ error: "full_name et roles requis" }, 400);
      }
      if (!email && !phone) {
        return json({ error: "Email ou numéro de téléphone requis" }, 400);
      }
      if (phone && !isValidPhone(String(phone))) {
        return json({ error: "Le numéro de téléphone doit contenir 10 chiffres" }, 400);
      }
      // Mot de passe : si fourni, min 6 caractères. Sinon on génère un temporaire.
      let pwd = password ? String(password) : "";
      const mustChange = !password;
      if (pwd && pwd.length < 6) {
        return json({ error: "Le mot de passe doit comporter au moins 6 caractères" }, 400);
      }
      if (!pwd) pwd = randomTempPassword();

      const loginEmail = email ? String(email).trim() : phoneToEmail(String(phone));

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: loginEmail,
        password: pwd,
        email_confirm: true,
        user_metadata: { full_name, phone: phone ?? null },
      });
      if (cErr || !created.user) return json({ error: cErr?.message ?? "Erreur création" }, 400);

      const newUserId = created.user.id;
      await admin.from("profiles").upsert({
        id: newUserId,
        ecole_id,
        full_name,
        phone: phone ?? null,
        must_change_password: mustChange,
      });
      for (const role of newRoles) {
        await admin.from("user_roles").insert({
          user_id: newUserId, ecole_id, role,
        });
      }
      return json({
        user_id: newUserId,
        temp_password: mustChange ? pwd : undefined,
        login_email: loginEmail,
      });
    }

    // ============= UPDATE =============
    if (action === "update") {
      const { target_user_id, full_name, email } = body;
      if (!target_user_id) return json({ error: "target_user_id requis" }, 400);

      if (full_name !== undefined) {
        await admin.from("profiles").update({ full_name }).eq("id", target_user_id);
      }
      if (email) {
        const { error: uErr } = await admin.auth.admin.updateUserById(target_user_id, {
          email, email_confirm: true,
        });
        if (uErr) return json({ error: uErr.message }, 400);
      }
      return json({ ok: true });
    }

    // ============= DELETE =============
    if (action === "delete") {
      const { target_user_id } = body;
      if (!target_user_id) return json({ error: "target_user_id requis" }, 400);
      if (target_user_id === user.id) return json({ error: "Impossible de supprimer son propre compte" }, 400);

      await admin.from("user_roles").delete().eq("user_id", target_user_id);
      await admin.from("user_permissions").delete().eq("user_id", target_user_id);
      await admin.from("profiles").delete().eq("id", target_user_id);
      const { error: dErr } = await admin.auth.admin.deleteUser(target_user_id);
      if (dErr) return json({ error: dErr.message }, 400);
      return json({ ok: true });
    }

    // ============= RESET PASSWORD =============
    if (action === "reset_password") {
      const { target_user_id, new_password } = body;
      if (!target_user_id || !new_password || String(new_password).length < 6) {
        return json({ error: "target_user_id et new_password (6+ car.) requis" }, 400);
      }
      const { error: pErr } = await admin.auth.admin.updateUserById(target_user_id, {
        password: new_password,
      });
      if (pErr) return json({ error: pErr.message }, 400);
      // Forcer un nouveau mot de passe à la prochaine connexion
      await admin.from("profiles").update({ must_change_password: true }).eq("id", target_user_id);
      return json({ ok: true });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e: any) {
    return json({ error: e.message ?? String(e) }, 500);
  }
});
