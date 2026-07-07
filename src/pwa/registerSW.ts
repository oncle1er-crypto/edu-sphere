/**
 * Enregistrement gardé du service worker PWA.
 *
 * Règles (skill PWA Lovable) :
 *  - Ne jamais s'enregistrer en dev / Lovable preview / iframe
 *  - Kill switch via `?sw=off`
 *  - Désenregistre tout SW résiduel dans les contextes refusés
 */

const SW_URL = "/sw.js";

function isLovablePreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

function shouldRefuse(): boolean {
  if (typeof window === "undefined") return true;
  if (!("serviceWorker" in navigator)) return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  if (isLovablePreviewHost(window.location.hostname)) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  }
  return false;
}

async function unregisterMatching() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister())
    );
  } catch {
    /* noop */
  }
}

/** Purge tout cache pouvant contenir des pages sensibles (auth/mfa). */
export async function purgeSensitiveCaches() {
  if (typeof caches === "undefined") return;
  try {
    await Promise.all([
      caches.delete("html-navigations"),
    ]);
  } catch {
    /* noop */
  }
}

export function registerPWA() {
  if (shouldRefuse()) {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      void unregisterMatching();
    }
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL).catch((err) => {
      console.warn("[PWA] SW registration failed:", err);
    });
  });
}

