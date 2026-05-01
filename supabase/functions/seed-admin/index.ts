import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async () => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Update password for existing admin user
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const admin = users?.users?.find((u) => u.email === "admin@gsp.ci");

  if (admin) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(admin.id, {
      password: "admin123",
      email_confirm: true,
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ ok: true, action: "password_reset", id: admin.id }));
  }

  // Create if not exists
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: "admin@gsp.ci",
    password: "admin123",
    email_confirm: true,
    user_metadata: { full_name: "Administrateur GSP" },
  });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true, action: "created", id: data.user.id }));
});
