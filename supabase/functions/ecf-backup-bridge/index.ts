// Passerelle de sauvegarde externe (lecture seule).
// Authentification : JWT OIDC GitHub Actions vérifié cryptographiquement (RS256).
// Aucun CORS : usage serveur-à-serveur uniquement.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "ecf-la-providence-backup";
const REPOSITORY = "oncle1er-crypto/edu-sphere";
const REF = "refs/heads/main";
const ENVIRONMENT = "production-backup";
const WORKFLOW_REF_PREFIX =
  "oncle1er-crypto/edu-sphere/.github/workflows/cloud-backup-la-providence.yml@refs/heads/main";
const MAX_LIMIT = 1000;
const SIGNED_URL_TTL = 120;

const JWKS = createRemoteJWKSet(
  new URL("https://token.actions.githubusercontent.com/.well-known/jwks"),
);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const serverKey =
  Deno.env.get("SUPABASE_SECRET_KEYS_DEFAULT") ??
  Deno.env.get("SUPABASE_SECRET_KEYS") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serverKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function clampLimit(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return MAX_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function offsetOf(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

async function authenticate(req: Request): Promise<boolean> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice(7).trim();
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["RS256"],
      clockTolerance: 0,
    });
    if (typeof payload.exp !== "number") return false;
    if (payload.repository !== REPOSITORY) return false;
    if (payload.ref !== REF) return false;
    if (payload.environment !== ENVIRONMENT) return false;
    const wf = payload.workflow_ref;
    if (typeof wf !== "string" || !wf.startsWith(WORKFLOW_REF_PREFIX)) return false;
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  if (!(await authenticate(req))) return json(401, { error: "unauthorized" });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "bad_request" });
  }

  const action = typeof body.action === "string" ? body.action : "";

  try {
    switch (action) {
      case "health":
        return json(200, { ok: true, ts: new Date().toISOString() });

      case "schema": {
        const { data, error } = await supabase.rpc("backup_export_schema_ddl", {
          _schemas: body.schemas ?? null,
        });
        if (error) throw error;
        return json(200, { data });
      }

      case "tables": {
        const { data, error } = await supabase.rpc("backup_list_tables", {
          _schemas: body.schemas ?? null,
        });
        if (error) throw error;
        return json(200, { data });
      }

      case "rows": {
        if (typeof body.schema !== "string" || typeof body.table !== "string") {
          return json(400, { error: "bad_request" });
        }
        const { data, error } = await supabase.rpc("backup_export_rows", {
          _schema: body.schema,
          _table: body.table,
          _limit: clampLimit(body.limit),
          _offset: offsetOf(body.offset),
        });
        if (error) throw error;
        return json(200, { data });
      }

      case "buckets": {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        return json(200, {
          data: (data ?? []).map((b) => ({
            id: b.id,
            name: b.name,
            public: b.public,
            created_at: b.created_at,
            updated_at: b.updated_at,
          })),
        });
      }

      case "objects": {
        if (typeof body.bucket !== "string") return json(400, { error: "bad_request" });
        const prefix = typeof body.prefix === "string" ? body.prefix : "";
        const { data, error } = await supabase.storage.from(body.bucket).list(prefix, {
          limit: clampLimit(body.limit),
          offset: offsetOf(body.offset),
        });
        if (error) throw error;
        return json(200, { data });
      }

      case "signed_url": {
        if (typeof body.bucket !== "string" || typeof body.path !== "string") {
          return json(400, { error: "bad_request" });
        }
        const { data, error } = await supabase.storage
          .from(body.bucket)
          .createSignedUrl(body.path, SIGNED_URL_TTL);
        if (error || !data?.signedUrl) throw error ?? new Error("signed_url_failed");
        return json(200, { url: data.signedUrl, expires_in: SIGNED_URL_TTL });
      }

      default:
        return json(400, { error: "unknown_action" });
    }
  } catch {
    return json(500, { error: "internal_error" });
  }
});
