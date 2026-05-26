// Wave Côte d'Ivoire — lien marchand GSP
// Format : https://pay.wave.com/m/{merchantId}/c/ci?amount={montant}
// L'ajout du paramètre `amount` pré-remplit le champ côté Wave.

export const WAVE_MERCHANT_BASE =
  "https://pay.wave.com/m/M_ci_T4B48wfg8Q4Y/c/ci";

export function buildWaveLink(montant?: number): string {
  if (!montant || montant <= 0) return WAVE_MERCHANT_BASE;
  return `${WAVE_MERCHANT_BASE}?amount=${Math.round(montant)}`;
}
