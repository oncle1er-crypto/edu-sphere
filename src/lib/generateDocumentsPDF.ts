import jsPDF from "jspdf";

export interface RecuData {
  ecole: { nom: string; devise: string; adresse: string; telephone: string };
  reference: string;
  eleve: { nom: string; prenom: string; matricule: string; classe: string };
  montant: number;
  mode: string;
  date_paiement: string;
}

export function generateRecuPDF(data: RecuData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
  const w = doc.internal.pageSize.getWidth();
  const m = 12;
  let y = m;

  const primary: [number, number, number] = [110, 26, 44]; // #6E1A2C
  const accent: [number, number, number] = [252, 227, 77]; // #FCE34D

  // Header band
  doc.setFillColor(...primary);
  doc.rect(0, 0, w, 28, "F");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(data.ecole.nom, w / 2, 12, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(data.ecole.devise, w / 2, 18, { align: "center" });
  doc.text(`${data.ecole.adresse} • ${data.ecole.telephone}`, w / 2, 23, { align: "center" });

  y = 35;
  doc.setFillColor(...accent);
  doc.rect(m, y, w - 2 * m, 8, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("REÇU DE PAIEMENT", w / 2, y + 6, { align: "center" });

  y += 14;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  const field = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, m, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, m + 35, y);
    y += 7;
  };

  field("Référence :", data.reference);
  field("Date :", new Date(data.date_paiement).toLocaleDateString("fr-FR"));
  y += 3;
  field("Élève :", `${data.eleve.prenom} ${data.eleve.nom}`);
  field("Matricule :", data.eleve.matricule);
  field("Classe :", data.eleve.classe);
  y += 3;
  field("Mode :", data.mode.replace("_", " ").toUpperCase());

  // Amount box
  y += 5;
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(m, y, w - 2 * m, 16, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("Montant reçu :", m + 5, y + 7);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primary);
  doc.text(`${data.montant.toLocaleString("fr-FR")} FCFA`, w - m - 5, y + 10, { align: "right" });

  // Footer
  y += 28;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150, 150, 150);
  doc.text("Ce document fait foi de paiement. Conservez-le précieusement.", w / 2, y, { align: "center" });

  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.text("Signature & cachet de l'école", w - m - 5, y, { align: "right" });
  doc.line(w - m - 45, y + 2, w - m, y + 2);

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
  doc.text(`Réf. : GSP/${data.annee.replace("-", "")}/${data.eleve.matricule}`, m, y);
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
