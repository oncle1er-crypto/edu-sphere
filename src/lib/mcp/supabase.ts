import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function supabaseProjectUrl(): string {
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("SUPABASE_URL (or VITE_SUPABASE_URL) is required");
  return url;
}

function supabasePublishableKey(): string {
  const direct = configuredEnv([
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]);
  if (direct) return direct;
  const keyset = runtimeEnv("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys.default, ...Object.values(keys)]
          .find((v): v is string => typeof v === "string" && v.trim().startsWith("sb_publishable_"))
          ?.trim();
        if (key) return key;
      }
    } catch {
      // Dictionnaire mal formé : on retombe sur les noms historiques.
    }
  }
  const legacy = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new Error("SUPABASE_PUBLISHABLE_KEY, SUPABASE_PUBLISHABLE_KEYS, or SUPABASE_ANON_KEY is required");
}

/** Client portant le jeton vérifié de l'utilisateur : la RLS s'applique comme lui. */
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("supabaseForUser requires a verified OAuth token");
  return createClient(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Contexte scolaire de l'utilisateur connecté : école + année active. */
export async function resolveContext(ctx: ToolContext) {
  const supabase = supabaseForUser(ctx);
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("ecole_id")
    .eq("id", ctx.getUserId() as string)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const ecoleId = (profile as { ecole_id?: string } | null)?.ecole_id ?? null;
  if (!ecoleId) throw new Error("Aucune école rattachée à ce compte.");

  const { data: annee } = await supabase
    .from("annees_scolaires")
    .select("id, libelle, statut")
    .eq("ecole_id", ecoleId)
    .eq("statut", "active")
    .maybeSingle();

  return {
    supabase,
    ecoleId,
    anneeId: (annee as { id?: string } | null)?.id ?? null,
    anneeLibelle: (annee as { libelle?: string } | null)?.libelle ?? null,
  };
}

export function fcfa(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}
