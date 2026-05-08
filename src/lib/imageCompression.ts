/**
 * Compresse et redimensionne une image côté client avant upload.
 * - Redimensionne pour que la plus grande dimension <= maxSize (px)
 * - Réencode en JPEG (qualité réglable)
 * - Renvoie un File prêt à téléverser
 */
export async function compressImage(
  file: File,
  opts: { maxSize?: number; quality?: number; mimeType?: string } = {}
): Promise<File> {
  const { maxSize = 800, quality = 0.82, mimeType = "image/jpeg" } = opts;

  if (!file.type.startsWith("image/")) return file;

  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Lecture du fichier impossible"));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Image illisible"));
    i.src = dataUrl;
  });

  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Échec compression"))), mimeType, quality)
  );

  const ext = mimeType === "image/png" ? "png" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.${ext}`, { type: mimeType });
}

/**
 * Charge une URL d'image et la convertit en data URL (base64) pour jsPDF.
 * Utilise crossOrigin pour les buckets publics Supabase.
 */
export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("read error"));
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
