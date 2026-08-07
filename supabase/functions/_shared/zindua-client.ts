/**
 * Client serveur Zindua (https://zindua.run) — sans dépendance npm.
 * Ne journalise jamais la clé API ni le contenu de `variables` (il porte l'OTP).
 */

export type ZinduaChannel = "whatsapp" | "email";

export type ZinduaSendResult =
  | { ok: true; logId?: string }
  | { ok: false; code: string; permanent: boolean };

export interface ZinduaSendParams {
  apiBaseUrl: string;
  to: string;
  channel: ZinduaChannel;
  template: string;
  lang?: string;
  variables?: Record<string, string>;
}

/** Codes d'erreur documentés par Zindua, tous permanents. */
const PERMANENT_PROVIDER_CODES = new Set([
  "EMAIL_SERVICE_NOT_CONFIGURED",
  "WHATSAPP_NOT_CONNECTED",
  "TEMPLATE_NOT_FOUND",
  "QUOTA_EXCEEDED",
  "INVALID_PHONE",
  "INVALID_EMAIL",
]);

/** Erreurs permanentes liées à la configuration → justifient un repli SMS. */
export const ZINDUA_CONFIG_ERRORS = new Set([
  "WHATSAPP_NOT_CONNECTED",
  "TEMPLATE_NOT_FOUND",
  "CLE_API_ABSENTE",
  "EMAIL_SERVICE_NOT_CONFIGURED",
  "URL_API_INVALIDE",
]);

const ALLOWED_HOSTS = new Set(["zindua.run", "www.zindua.run", "api.zindua.run"]);
const TIMEOUT_MS = 10_000;

function extractCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const raw =
    (typeof p.code === "string" && p.code) ||
    (typeof p.error_code === "string" && p.error_code) ||
    (typeof p.error === "string" && p.error) ||
    null;
  return raw ? String(raw).toUpperCase().replace(/[^A-Z0-9_]/g, "_") : null;
}

function extractLogId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as Record<string, unknown>;
  const candidate = p.logId ?? p.log_id ?? p.id ?? (p.data as Record<string, unknown> | undefined)?.logId;
  return typeof candidate === "string" || typeof candidate === "number" ? String(candidate) : undefined;
}

export async function zinduaSend(params: ZinduaSendParams): Promise<ZinduaSendResult> {
  const apiKey = Deno.env.get("ZINDUA_API_KEY");
  if (!apiKey) return { ok: false, code: "CLE_API_ABSENTE", permanent: true };

  let url: URL;
  try {
    url = new URL(`${params.apiBaseUrl.replace(/\/+$/, "")}/send`);
  } catch {
    return { ok: false, code: "URL_API_INVALIDE", permanent: true };
  }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    return { ok: false, code: "URL_API_INVALIDE", permanent: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        to: params.to,
        channel: params.channel,
        template: params.template,
        lang: params.lang ?? "fr",
        variables: params.variables ?? {},
      }),
      signal: controller.signal,
    });

    let payload: unknown = null;
    try {
      payload = await resp.json();
    } catch {
      payload = null;
    }

    if (resp.ok) {
      const code = extractCode(payload);
      if (code && code !== "OK" && code !== "SUCCESS") {
        return {
          ok: false,
          code,
          permanent: PERMANENT_PROVIDER_CODES.has(code),
        };
      }
      return { ok: true, logId: extractLogId(payload) };
    }

    if (resp.status === 429) {
      return { ok: false, code: extractCode(payload) ?? "RATE_LIMITED", permanent: false };
    }
    if (resp.status >= 500) {
      return { ok: false, code: extractCode(payload) ?? "PROVIDER_ERROR", permanent: false };
    }

    const code = extractCode(payload) ?? `HTTP_${resp.status}`;
    return { ok: false, code, permanent: true };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return { ok: false, code: aborted ? "TIMEOUT" : "ERREUR_RESEAU", permanent: false };
  } finally {
    clearTimeout(timer);
  }
}

export type ZinduaTemplatesResult =
  | { ok: true; endpoint: string; templates: string[]; raw: unknown }
  | { ok: false; code: string; essais: { endpoint: string; status: number | null; body?: unknown }[] };

function collectTemplateNames(payload: unknown): string[] {
  const noms = new Set<string>();
  const visit = (v: unknown, depth: number) => {
    if (depth > 4 || v == null) return;
    if (Array.isArray(v)) { v.forEach((x) => visit(x, depth + 1)); return; }
    if (typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    for (const k of ["slug", "name", "template", "template_name", "code"]) {
      if (typeof o[k] === "string" && o[k]) noms.add(String(o[k]));
    }
    for (const val of Object.values(o)) {
      if (val && typeof val === "object") visit(val, depth + 1);
    }
  };
  visit(payload, 0);
  return [...noms];
}

/** Liste les modèles disponibles chez Zindua (diagnostic de configuration). */
export async function zinduaListTemplates(apiBaseUrl: string): Promise<ZinduaTemplatesResult> {
  const apiKey = Deno.env.get("ZINDUA_API_KEY");
  if (!apiKey) return { ok: false, code: "CLE_API_ABSENTE", essais: [] };

  const base = apiBaseUrl.replace(/\/+$/, "");
  const chemins = ["/templates", "/whatsapp/templates", "/messages/templates", "/template"];
  const essais: { endpoint: string; status: number | null; body?: unknown }[] = [];

  for (const chemin of chemins) {
    let url: URL;
    try { url = new URL(base + chemin); } catch { continue; }
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
      return { ok: false, code: "URL_API_INVALIDE", essais };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: controller.signal,
      });
      const payload = await resp.json().catch(() => null);
      essais.push({ endpoint: chemin, status: resp.status, body: resp.ok ? undefined : payload });
      if (resp.ok) {
        return { ok: true, endpoint: chemin, templates: collectTemplateNames(payload), raw: payload };
      }
    } catch {
      essais.push({ endpoint: chemin, status: null });
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, code: "TEMPLATES_INTROUVABLES", essais };
}
