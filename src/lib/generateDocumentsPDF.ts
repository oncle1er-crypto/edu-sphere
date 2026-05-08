import jsPDF from "jspdf";

export interface RecuData {
  ecole: {
    nom: string;
    sigle?: string;
    devise: string;
    adresse: string;
    telephone: string;
    email?: string;
    logoUrl?: string | null;
  };
  reference: string;
  eleve: { nom: string; prenom: string; matricule: string; classe: string; photo_url?: string | null };
  montant: number;
  mode: string;
  date_paiement: string;
  total_du?: number;
  total_paye?: number;
  recu_par?: string;
}

async function loadImageAsDataURL(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { data: dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

const formatFCFA = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;

const monthsFR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const formatDateLong = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")} ${monthsFR[d.getMonth()]} ${d.getFullYear()}`;
};

export async function generateRecuPDF(data: RecuData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297
  const halfH = H / 2;

  const ink: [number, number, number] = [40, 40, 45];
  const muted: [number, number, number] = [120, 120, 128];
  const line: [number, number, number] = [210, 210, 215];
  const primary: [number, number, number] = [110, 26, 44];
  const success: [number, number, number] = [22, 122, 70];
  const warn: [number, number, number] = [180, 95, 6];

  const logo = data.ecole.logoUrl ? await loadImageAsDataURL(data.ecole.logoUrl) : null;

  const totalDu = data.total_du ?? 0;
  const totalPaye = data.total_paye ?? data.montant;
  const reste = Math.max(0, totalDu - totalPaye);
  const solde = totalDu > 0 && reste <= 0;

  // Précharge la photo une seule fois (évite double await dans les 2 copies)
  const photoData = data.eleve.photo_url ? await loadImageAsDataURL(data.eleve.photo_url) : null;

  const drawCopy = (offsetY: number, label: string) => {
    const M = 16;
    let y = offsetY + 12;

    // ── Header (no color band, just typography + logo) ──
    if (logo) {
      const logoH = 16;
      const logoW = (logo.w / logo.h) * logoH;
      doc.addImage(logo.data, "PNG", M, y, logoW, logoH);
    }
    const tx = logo ? M + 22 : M;
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...primary);
    doc.text(data.ecole.nom.toUpperCase(), tx, y + 6);
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...muted);
    doc.text(`« ${data.ecole.devise} »`, tx, y + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`${data.ecole.adresse} • Tél : ${data.ecole.telephone}${data.ecole.email ? " • " + data.ecole.email : ""}`, tx, y + 15);

    // Copy label (top right)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(label.toUpperCase(), W - M, y + 2, { align: "right" });
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...ink);
    doc.text("REÇU DE PAIEMENT", W - M, y + 9, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`N° ${data.reference}`, W - M, y + 14, { align: "right" });

    // Thin separator
    y += 22;
    doc.setDrawColor(...line);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);

    // ── Info grid (2 columns) ──
    y += 7;
    const colW = (W - 2 * M) / 2;
    const drawField = (label: string, value: string, x: number, yy: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(label.toUpperCase(), x, yy);
      doc.setFont("times", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...ink);
      doc.text(value || "—", x, yy + 5);
    };

    // Photo de l'élève (coin droit)
    if (data.eleve.photo_url) {
      const photo = await loadImageAsDataURL(data.eleve.photo_url);
      if (photo) {
        try {
          doc.addImage(photo.data, "JPEG", W - M - 18, y - 2, 16, 18);
        } catch { /* ignore */ }
      }
    }

    // Row 1
    drawField("Élève", `${data.eleve.prenom} ${data.eleve.nom}`, M, y);
    drawField("Date du paiement", formatDateLong(data.date_paiement), M + colW, y);
    // Row 2
    drawField("Matricule", data.eleve.matricule || "—", M, y + 12);
    drawField("Classe", data.eleve.classe || "—", M + colW, y + 12);
    // Row 3
    drawField("Mode de règlement", data.mode.replace(/_/g, " ").toUpperCase(), M, y + 24);
    drawField("Reçu par", data.recu_par || "Caisse", M + colW, y + 24);

    // ── Amount line (no filled box, just typography) ──
    y += 36;
    doc.setDrawColor(...line);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);

    y += 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text("MONTANT REÇU", M, y);
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...primary);
    doc.text(formatFCFA(data.montant), W - M, y + 2, { align: "right" });

    // ── Status / Solde ──
    y += 10;
    if (totalDu > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text(`Total dû : ${formatFCFA(totalDu)}    •    Total réglé : ${formatFCFA(totalPaye)}`, M, y);
    }

    // Badge
    y += 6;
    const badgeText = solde ? "SOLDÉ" : `RESTE À PAYER : ${formatFCFA(reste)}`;
    const badgeColor = solde ? success : warn;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const tw = doc.getTextWidth(badgeText) + 8;
    doc.setDrawColor(...badgeColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, tw, 7, 1.5, 1.5, "S");
    doc.setTextColor(...badgeColor);
    doc.text(badgeText, M + 4, y + 4.8);

    // ── Footer / signature ──
    const footY = offsetY + halfH - 16;
    doc.setDrawColor(...line);
    doc.line(W - M - 55, footY, W - M, footY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text("Signature & cachet", W - M - 27.5, footY + 4, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(
      "Ce reçu fait foi de paiement. Aucun remboursement ne sera effectué sans présentation du présent document.",
      M, footY + 4, { maxWidth: W - 2 * M - 65 }
    );
  };

  // Top half — Exemplaire client
  drawCopy(0, "Exemplaire — Famille");

  // Dotted separator (scissor cut line)
  const sepY = halfH;
  doc.setDrawColor(160, 160, 165);
  doc.setLineWidth(0.25);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(8, sepY, W - 8, sepY);
  doc.setLineDashPattern([], 0);
  // little scissor hint
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 165);
  doc.text("✂  -  -  -  -  Découper le long des pointillés  -  -  -  -", W / 2, sepY - 1, { align: "center" });

  // Bottom half — Souche école
  drawCopy(halfH, "Souche — École");

  return doc;
}

export interface CertificatData {
  ecole: { nom: string; devise: string; adresse: string; telephone: string; directeur: string };
  eleve: { nom: string; prenom: string; matricule: string; date_naissance: string; lieu_naissance: string };
  classe: string;
  annee: string;
  type: "scolarite" | "inscription" | "frequentation";
}

export function generateCertificatPDF(data: CertificatData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const m = 20;
  let y = m;

  const primary: [number, number, number] = [110, 26, 44];
  const accent: [number, number, number] = [252, 227, 77];

  // Header
  doc.setFillColor(...primary);
  doc.rect(0, 0, w, 35, "F");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(data.ecole.nom, w / 2, 14, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.ecole.devise, w / 2, 21, { align: "center" });
  doc.text(`${data.ecole.adresse} • Tél: ${data.ecole.telephone}`, w / 2, 28, { align: "center" });

  y = 45;

  // Title
  const titles: Record<string, string> = {
    scolarite: "CERTIFICAT DE SCOLARITÉ",
    inscription: "ATTESTATION D'INSCRIPTION",
    frequentation: "CERTIFICAT DE FRÉQUENTATION",
  };
  doc.setFillColor(...accent);
  doc.rect(m, y, w - 2 * m, 10, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(titles[data.type], w / 2, y + 7, { align: "center" });

  y += 20;

  // Reference
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Réf. : CSP/${data.annee.replace("-", "")}/${data.eleve.matricule}`, m, y);
  doc.text(`Abidjan, le ${new Date().toLocaleDateString("fr-FR")}`, w - m, y, { align: "right" });

  y += 15;

  // Body
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");

  const body = data.type === "scolarite"
    ? `Le Directeur du ${data.ecole.nom} certifie que l'élève ${data.eleve.prenom} ${data.eleve.nom}, né(e) le ${data.eleve.date_naissance} à ${data.eleve.lieu_naissance}, matricule ${data.eleve.matricule}, est régulièrement inscrit(e) en classe de ${data.classe} pour l'année scolaire ${data.annee}.`
    : data.type === "inscription"
    ? `Le Directeur du ${data.ecole.nom} atteste que l'élève ${data.eleve.prenom} ${data.eleve.nom}, né(e) le ${data.eleve.date_naissance} à ${data.eleve.lieu_naissance}, matricule ${data.eleve.matricule}, est inscrit(e) en classe de ${data.classe} au titre de l'année scolaire ${data.annee}.`
    : `Le Directeur du ${data.ecole.nom} certifie que l'élève ${data.eleve.prenom} ${data.eleve.nom}, né(e) le ${data.eleve.date_naissance} à ${data.eleve.lieu_naissance}, matricule ${data.eleve.matricule}, fréquente régulièrement l'établissement en classe de ${data.classe} pour l'année scolaire ${data.annee}.`;

  const lines = doc.splitTextToSize(body, w - 2 * m);
  doc.text(lines, m, y);
  y += lines.length * 6 + 10;

  doc.text("En foi de quoi, le présent certificat est délivré pour servir et valoir ce que de droit.", m, y);

  // Signature
  y += 30;
  doc.setFont("helvetica", "bold");
  doc.text("Le Directeur", w - m - 40, y);
  doc.setFont("helvetica", "normal");
  y += 20;
  doc.text(data.ecole.directeur || "____________________", w - m - 40, y);

  // Footer
  const bottom = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`${data.ecole.nom} — Établissement privé confessionnel catholique — Archidiocèse d'Abidjan`, w / 2, bottom, { align: "center" });

  return doc;
}
