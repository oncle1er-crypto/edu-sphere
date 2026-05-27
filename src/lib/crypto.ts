// Petits utilitaires crypto côté navigateur

export async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Génère un code aléatoire alphanumérique en majuscules, ex: ABCD-1234 */
export function generateBackupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const part = (start: number) =>
    Array.from(bytes.slice(start, start + 4))
      .map((b) => chars[b % chars.length])
      .join("");
  return `${part(0)}-${part(4)}`;
}

/** Empreinte simple et stable de l'appareil/navigateur courant */
export async function getDeviceFingerprint(): Promise<string> {
  const raw = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    (navigator as any).hardwareConcurrency || "",
    (navigator as any).platform || "",
  ].join("|");
  return (await sha256(raw)).slice(0, 32);
}
