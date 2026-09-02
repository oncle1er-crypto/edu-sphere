export function calculerPartsFiscales(
  situation: string | null | undefined,
  sexe: string | null | undefined,
  enfantsACharge: number,
): number {
  const enfants = Math.max(0, Math.floor(enfantsACharge || 0));
  const marie = situation === "Marié(e)";
  const veuf = situation === "Veuf/Veuve";

  if (marie && sexe === "F") return 1;
  if ((marie || (veuf && enfants > 0)) && sexe === "M") {
    return Math.min(5, 2 + enfants * 0.5);
  }
  if (enfants > 0) return Math.min(5, 1.5 + enfants * 0.5);
  return 1;
}

export function partsFiscalesValides(parts: number): boolean {
  return Number.isFinite(parts) && parts >= 1 && parts <= 5 && parts * 2 === Math.round(parts * 2);
}
