import { lazy, type ComponentType } from "react";

/**
 * Wraps React.lazy with a one-shot reload on chunk load failure.
 * After a redeploy, hashed chunk filenames change and old tabs request
 * stale URLs that 404. We reload the page once to fetch the new index.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const KEY = "lovable:chunk-reloaded";
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      const isChunkError =
        /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
          msg
        );
      if (isChunkError && typeof window !== "undefined") {
        // Hors ligne : basculer sur la page de secours dédiée
        if (!navigator.onLine && window.location.pathname !== "/offline") {
          window.location.replace("/offline");
          return await new Promise<{ default: T }>(() => {});
        }
        const already = sessionStorage.getItem(KEY);
        if (!already) {
          sessionStorage.setItem(KEY, "1");
          window.location.reload();
          // Return a never-resolving promise while reload happens
          return await new Promise<{ default: T }>(() => {});
        }
        // Second échec consécutif : afficher la page hors-ligne plutôt qu'un écran blanc
        if (window.location.pathname !== "/offline") {
          window.location.replace("/offline");
          return await new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }
  });
}
