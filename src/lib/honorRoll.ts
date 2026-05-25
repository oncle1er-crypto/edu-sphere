// Petit utilitaire de persistance du seuil "Tableau d'honneur".
// Stocké en localStorage pour rester aligné avec les autres paramètres
// académiques actuellement non persistés en base.

const KEY = "honor_roll_threshold";
export const DEFAULT_HONOR_ROLL_THRESHOLD = 14;

export function getHonorRollThreshold(): number {
  if (typeof window === "undefined") return DEFAULT_HONOR_ROLL_THRESHOLD;
  const raw = window.localStorage.getItem(KEY);
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 20) return DEFAULT_HONOR_ROLL_THRESHOLD;
  return n;
}

export function setHonorRollThreshold(value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, String(value));
  window.dispatchEvent(new CustomEvent("honor-roll-threshold-changed", { detail: value }));
}
