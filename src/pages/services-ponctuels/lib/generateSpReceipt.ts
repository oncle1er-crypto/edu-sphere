import jsPDF from "jspdf";

export interface SpReceiptData {
  numero: string;
  date: string;
  ecoleNom: string;
  ecoleSigle?: string;
  ecoleAdresse?: string;
  ecoleTelephone?: string;
  ecoleEmail?: string;
  logoUrl?: string | null;
  service: string;
  beneficiaire: string;
  quantite?: number;
  montantDu?: number;
  montantPaye: number;
  remise?: number;
  reste?: number;
  modePaiement: string;
  caissier?: string;
  observations?: string;
  titre?: string;
}

const fmt = (n: number) => {
  const s = String(Math.abs(Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${(n || 0) < 0 ? "-" : ""}${s} FCFA`;
};

const MODES: Record<string, string> = {
  especes: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_money: "MTN Money",
  moov_money: "Moov Money",
  virement: "Virement",
  cheque: "Chèque",
};

// Bordeaux — seule couleur d'accent
const ACCENT: [number, number, number] = [110, 26, 44];
const INK: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [110, 110, 110];
const RULE: [number, number, number] = [200, 200, 200];

async function loadImage(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl: string = await new Promise((r, j) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.onerror = j;
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((r) => {
      const img = new Image();
      img.onload = () => r({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => r({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

/**
 * Reçu professionnel A4 portrait avec deux souches identiques
 * (Copie Client + Souche École) séparées par une ligne de coupe.
 * Palette sobre : bordeaux d'accent uniquement.
 */
export async function generateSpReceipt(d: SpReceiptData) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();   // 210
  const pageH = doc.internal.pageSize.getHeight();  // 297
  const half = pageH / 2;                            // 148.5

  const logo = d.logoUrl ? await loadImage(d.logoUrl) : null;

  const drawCopy = (top: number, label: "COPIE CLIENT" | "SOUCHE ÉCOLE") => {
    const left = 14;
    const right = pageW - 14;
    let y = top + 12;

    // Logo
    if (logo) {
      const maxH = 18;
      const ratio = logo.w / logo.h || 1;
      const h = maxH;
      const w = h * ratio;
      try { doc.addImage(logo.dataUrl, "PNG", left, y - 4, w, h); } catch { /* ignore */ }
    }

    // En-tête école (centré)
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(d.ecoleNom.toUpperCase(), pageW / 2, y, { align: "center" });
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const meta = [d.ecoleAdresse, d.ecoleTelephone && `Tél. ${d.ecoleTelephone}`, d.ecoleEmail]
      .filter(Boolean).join("  ·  ");
    if (meta) { doc.text(meta, pageW / 2, y, { align: "center" }); y += 4; }

    // Étiquette souche (à droite)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...ACCENT);
    doc.text(label, right, top + 8, { align: "right" });
    doc.setTextColor(...INK);

    // Filet séparateur
    y += 3;
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.6);
    doc.line(left, y, right, y);
    y += 7;

    // Titre du reçu
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(d.titre ?? "REÇU DE PAIEMENT", pageW / 2, y, { align: "center" });
    y += 6;

    // N° et date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(`N°`, left, y);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.text(d.numero, left + 8, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`Date`, right - 42, y);
    doc.setTextColor(...INK);
    doc.text(d.date, right, y, { align: "right" });
    y += 7;

    // Ligne clé/valeur
    const kv = (label: string, value: string, opts: { bold?: boolean } = {}) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED);
      doc.text(label, left, y);
      doc.setTextColor(...INK);
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.text(value, right, y, { align: "right" });
      y += 5.5;
    };

    kv("Service", d.service);
    kv("Bénéficiaire", d.beneficiaire, { bold: true });
    if (d.quantite) kv("Quantité", String(d.quantite));
    kv("Mode de paiement", MODES[d.modePaiement] ?? d.modePaiement);
    if (d.montantDu != null) kv("Montant dû", fmt(d.montantDu));
    if (d.remise && d.remise > 0) kv("Remise accordée", fmt(d.remise));

    // Bloc total (sobre : filet + typographie)
    y += 2;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.2);
    doc.line(left, y, right, y);
    y += 6.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text("TOTAL ENCAISSÉ", left, y);
    doc.setTextColor(...ACCENT);
    doc.setFontSize(15);
    doc.text(fmt(d.montantPaye), right, y, { align: "right" });
    doc.setTextColor(...INK);
    y += 6;

    if (d.reste && d.reste > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(`Reste à payer : ${fmt(d.reste)}`, left, y);
      doc.setTextColor(...INK);
      y += 5;
    }

    if (d.observations) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(`Observations : ${d.observations}`, left, y, { maxWidth: right - left });
      doc.setTextColor(...INK);
    }

    // Bas de souche : caissier / signature
    const footY = top + half - 12;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.2);
    doc.line(left, footY - 8, left + 55, footY - 8);
    doc.line(right - 55, footY - 8, right, footY - 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(d.caissier ? `Caissier : ${d.caissier}` : "Caissier", left, footY - 4);
    doc.text("Signature & cachet", right, footY - 4, { align: "right" });
    doc.setTextColor(...INK);
  };

  // Copie client (haut)
  drawCopy(0, "COPIE CLIENT");

  // Ligne de coupe pointillée
  doc.setDrawColor(...MUTED);
  doc.setLineDashPattern([1.4, 1.4], 0);
  doc.setLineWidth(0.2);
  doc.line(10, half, pageW - 10, half);
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("✂  découper ici", pageW / 2, half - 1, { align: "center" });
  doc.setTextColor(...INK);

  // Souche école (bas)
  drawCopy(half, "SOUCHE ÉCOLE");

  doc.save(`recu-${d.numero}.pdf`);
}
