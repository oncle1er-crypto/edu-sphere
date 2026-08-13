import jsPDF from "jspdf";

export interface AttestationData {
  ecole: {
    nom: string;
    sigle?: string | null;
    adresse?: string | null;
    telephone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
    devise?: string | null;
  };
  eleve: {
    nom: string;
    prenom: string;
    matricule: string;
    date_naissance?: string | null;
    sexe?: string | null;
    classe?: string | null;
    photo_url?: string | null;
  };
  reference: string;
  annee_scolaire?: string | null;
  total_paye?: number;
  total_du?: number;
  finalise_par?: string | null;
  date_inscription: string;
}

const monthsFR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const formatDateLong = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")} ${monthsFR[d.getMonth()]} ${d.getFullYear()}`;
};
const formatFCFA = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;

async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function generateAttestationInscriptionPDF(data: AttestationData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const primary: [number, number, number] = [110, 26, 44];
  const ink: [number, number, number] = [40, 40, 45];
  const muted: [number, number, number] = [120, 120, 128];

  const logo = data.ecole.logoUrl ? await loadImage(data.ecole.logoUrl) : null;

  // Header band
  doc.setFillColor(...primary);
  doc.rect(0, 0, W, 35, "F");
  if (logo) {
    try { doc.addImage(logo, "PNG", 15, 6, 22, 22); } catch (e) {
      console.warn("generateAttestationInscriptionPDF: insertion du logo échouée", e);
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.ecole.nom.toUpperCase(), logo ? 42 : 15, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const sub = [data.ecole.sigle, data.ecole.adresse, data.ecole.telephone].filter(Boolean).join(" • ");
  if (sub) doc.text(sub, logo ? 42 : 15, 22);
  doc.setFontSize(8);
  doc.text(`Réf : ${data.reference}`, W - 15, 16, { align: "right" });
  doc.text(formatDateLong(data.date_inscription), W - 15, 22, { align: "right" });

  // Title
  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CONFIRMATION D'INSCRIPTION", W / 2, 55, { align: "center" });
  if (data.annee_scolaire) {
    doc.setFontSize(11);
    doc.setTextColor(...muted);
    doc.text(`Année scolaire ${data.annee_scolaire}`, W / 2, 62, { align: "center" });
  }

  // Body
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  let y = 78;
  doc.text("Le Directeur soussigné atteste que l'élève désigné ci-dessous est définitivement", 15, y);
  y += 6;
  doc.text("inscrit dans notre établissement pour l'année scolaire en cours.", 15, y);

  // Student card
  y += 12;
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, y, W - 30, 50, 3, 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primary);
  doc.text("ÉLÈVE", 20, y + 8);
  doc.setTextColor(...ink);
  doc.setFontSize(13);
  doc.text(`${data.eleve.nom} ${data.eleve.prenom}`, 20, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  const lines: string[] = [];
  lines.push(`Matricule : ${data.eleve.matricule}`);
  if (data.eleve.sexe) lines.push(`Sexe : ${data.eleve.sexe === "F" ? "Féminin" : "Masculin"}`);
  if (data.eleve.date_naissance) lines.push(`Né(e) le : ${formatDateLong(data.eleve.date_naissance)}`);
  if (data.eleve.classe) lines.push(`Classe : ${data.eleve.classe}`);
  lines.forEach((l, i) => doc.text(l, 20, y + 24 + i * 5));

  // Financial summary
  y += 60;
  if (typeof data.total_du === "number" && typeof data.total_paye === "number") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...primary);
    doc.text("SITUATION FINANCIÈRE", 20, y);
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y += 7;
    doc.text(`Frais annuels : ${formatFCFA(data.total_du)}`, 20, y);
    y += 5;
    doc.text(`Déjà versé : ${formatFCFA(data.total_paye)}`, 20, y);
    y += 5;
    doc.text(`Reste à payer : ${formatFCFA(Math.max(0, data.total_du - data.total_paye))}`, 20, y);
    y += 10;
  }

  // Footer
  doc.setTextColor(...muted);
  doc.setFontSize(9);
  doc.text(`Document généré le ${formatDateLong(data.date_inscription)}${data.finalise_par ? " par " + data.finalise_par : ""}.`, 15, 270);
  doc.text("Cette attestation fait foi de l'inscription définitive de l'élève dans l'établissement.", 15, 275);

  // Signature box
  doc.setDrawColor(180, 180, 185);
  doc.setLineWidth(0.2);
  doc.rect(W - 75, 240, 60, 25);
  doc.setFontSize(8);
  doc.text("Cachet et signature", W - 45, 263, { align: "center" });

  return doc;
}
