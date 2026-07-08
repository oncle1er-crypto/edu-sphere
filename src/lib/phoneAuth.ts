// Domaine interne pour les comptes créés avec un numéro de téléphone.
// Doit rester en synchro avec supabase/functions/admin-manage-users/index.ts.
export const PHONE_EMAIL_DOMAIN = "phone.laprovidence.ci";

export const isValidPhone10 = (p: string) => /^\d{10}$/.test(p);

export const phoneToLoginEmail = (phone: string) => `${phone}@${PHONE_EMAIL_DOMAIN}`;

/** Détermine si un identifiant saisi est un email ou un numéro à 10 chiffres. */
export function resolveLoginEmail(identifier: string): { email: string; kind: "email" | "phone" } | null {
  const raw = identifier.trim();
  if (!raw) return null;
  const digits = raw.replace(/[\s.\-]/g, "");
  if (isValidPhone10(digits)) return { email: phoneToLoginEmail(digits), kind: "phone" };
  if (raw.includes("@")) return { email: raw, kind: "email" };
  return null;
}
