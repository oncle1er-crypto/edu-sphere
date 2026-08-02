/**
 * Normalisation E.164 pour la Côte d'Ivoire.
 * Ne complète JAMAIS un chiffre manquant : retourne null si le format est inconnu.
 */
export function normalizePhoneCI(input: string | null | undefined): { e164: string } | null {
  if (!input) return null;
  const cleaned = String(input).replace(/[\s.\-()]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("+225")) {
    const rest = cleaned.slice(4);
    if (!/^\d{8,12}$/.test(rest)) return null;
    return { e164: `+225${rest}` };
  }

  if (cleaned.startsWith("00225")) {
    const rest = cleaned.slice(5);
    if (!/^\d{8,12}$/.test(rest)) return null;
    return { e164: `+225${rest}` };
  }

  if (/^\d{10}$/.test(cleaned) && /^(01|05|07|27)/.test(cleaned)) {
    return { e164: `+225${cleaned}` };
  }

  return null;
}
