import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persiste l'état d'un formulaire dans sessionStorage pour éviter la perte
 * de saisie lors d'une navigation. `clear()` doit être appelé après
 * soumission réussie. La clé doit être unique par formulaire.
 */
export function useDraftForm<T extends Record<string, any>>(
  key: string,
  initialValue: T,
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled ?? true;
  const storageKey = `draft:${key}`;

  const [state, setState] = useState<T>(() => {
    if (!enabled || typeof window === "undefined") return initialValue;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) return { ...initialValue, ...JSON.parse(raw) };
    } catch (e) {
      console.warn(`useDraftForm(${key}): lecture du brouillon échouée`, e);
    }
    return initialValue;
  });

  const first = useRef(true);
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn(`useDraftForm(${storageKey}): écriture du brouillon échouée`, e);
    }
  }, [state, storageKey, enabled]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (e) {
      console.warn(`useDraftForm(${storageKey}): suppression du brouillon échouée`, e);
    }
    setState(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const reset = useCallback((next: T) => {
    setState(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      console.warn(`useDraftForm(${storageKey}): écriture du brouillon échouée (reset)`, e);
    }
  }, [storageKey]);

  return [state, setState, clear, reset] as const;
}

/** Purge tous les brouillons (à appeler au sign-out). */
export function clearAllDrafts() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("draft:")) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch (e) {
    console.warn("clearAllDrafts: purge des brouillons échouée", e);
  }
}
