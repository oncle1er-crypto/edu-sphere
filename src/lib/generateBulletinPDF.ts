import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { urlToDataUrl } from "./imageCompression";

export interface BulletinSubjectRow {
  matiere: string;
  note: number | null;
  coefficient: number;
  moyenne_classe: number;
  appreciation: string;
}

export interface BulletinData {
  ecole: { nom: string; devise: string; adresse: string; telephone: string };
  eleve: { nom: string; prenom: string; matricule: string; date_naissance: string; sexe: string; photo_url?: string | null };
  classe: string;
  annee: string;
  periode: string;
  matieres: BulletinSubjectRow[];
  moyenne_generale: number;
  rang: number;
  total_eleves: number;
  mention: string;
}

function getAppreciation(note: number | null): string {
  if (note === null) return "-";
  if (note >= 16) return "Très bien";
  if (note >= 14) return "Bien";
  if (note >= 12) return "Assez bien";
  if (note >= 10) return "Passable";
  return "Insuffisant";
}

export async function generateBulletinPDF(data: BulletinData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ── Colors ──
  const bordeaux: [number, number, number] = [110, 26, 44]; // #6E1A2C
  const gold: [number, number, number] = [180, 160, 60];

  // ── Header bar ──
  doc.setFillColor(...bordeaux);
  doc.rect(0, 0, pageWidth, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.ecole.nom.toUpperCase(), pageWidth / 2, 12, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`« ${data.ecole.devise} »`, pageWidth / 2, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${data.ecole.adresse} | Tel: ${data.ecole.telephone}`, pageWidth / 2, 24, { align: "center" });

  // Gold accent line
  doc.setFillColor(...gold);
  doc.rect(0, 38, pageWidth, 1.5, "F");

  // ── Title ──
  y = 48;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("BULLETIN DE NOTES", pageWidth / 2, y, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  y += 7;
  doc.text(`${data.periode} - Annee scolaire ${data.annee}`, pageWidth / 2, y, { align: "center" });

  // ── Student info box ──
  y += 10;
  doc.setDrawColor(...bordeaux);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 24, 2, 2, "S");

  // Photo de l'élève (si disponible)
  if (data.eleve.photo_url) {
    const dataUrl = await urlToDataUrl(data.eleve.photo_url);
    if (dataUrl) {
      try {
        const fmt = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, fmt, pageWidth - margin - 20, y + 2, 18, 20);
      } catch { /* ignore */ }
    }
  }

  const col1 = margin + 4;
  const col2 = pageWidth / 2 + 5;
  doc.setFontSize(9);
  const infoY = y + 6;

  doc.setFont("helvetica", "bold");
  doc.text("Nom :", col1, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.eleve.nom} ${data.eleve.prenom}`, col1 + 18, infoY);

  doc.setFont("helvetica", "bold");
  doc.text("Matricule :", col2, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(data.eleve.matricule, col2 + 24, infoY);

  doc.setFont("helvetica", "bold");
  doc.text("Classe :", col1, infoY + 7);
  doc.setFont("helvetica", "normal");
  doc.text(data.classe, col1 + 18, infoY + 7);

  doc.setFont("helvetica", "bold");
  doc.text("Ne(e) le :", col2, infoY + 7);
  doc.setFont("helvetica", "normal");
  doc.text(data.eleve.date_naissance || "-", col2 + 24, infoY + 7);

  doc.setFont("helvetica", "bold");
  doc.text("Sexe :", col1, infoY + 14);
  doc.setFont("helvetica", "normal");
  doc.text(data.eleve.sexe === "F" ? "Feminin" : "Masculin", col1 + 18, infoY + 14);

  // ── Grades table ──
  y += 32;

  const tableBody = data.matieres.map((m) => [
    m.matiere,
    m.note !== null ? m.note.toFixed(2) : "ABS",
    String(m.coefficient),
    m.note !== null ? (m.note * m.coefficient).toFixed(2) : "-",
    m.moyenne_classe.toFixed(2),
    m.appreciation,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Matiere", "Note /20", "Coef.", "Points", "Moy. Classe", "Appreciation"]],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: bordeaux,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [252, 248, 248],
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { halign: "center", cellWidth: 22 },
      2: { halign: "center", cellWidth: 16 },
      3: { halign: "center", cellWidth: 22 },
      4: { halign: "center", cellWidth: 25 },
      5: { cellWidth: 30 },
    },
  });

  // ── Summary box ──
  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 60;
  y = finalY + 8;

  doc.setFillColor(252, 248, 248);
  doc.setDrawColor(...bordeaux);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 22, 2, 2, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...bordeaux);
  doc.text(`Moyenne Generale : ${data.moyenne_generale.toFixed(2)} /20`, col1, y + 8);
  doc.text(`Rang : ${data.rang} / ${data.total_eleves}`, col2, y + 8);

  doc.setFontSize(11);
  doc.text(`Mention : ${data.mention}`, col1, y + 17);

  // ── Decision / signatures ──
  y += 32;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Decision du conseil de classe :", margin, y);
  doc.setFont("helvetica", "normal");
  doc.line(margin + 58, y, pageWidth - margin, y);

  y += 18;
  doc.setFont("helvetica", "bold");
  doc.text("Le Directeur", margin + 10, y);
  doc.text("Le Parent / Tuteur", pageWidth - margin - 45, y);

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 8;
  doc.setFillColor(...bordeaux);
  doc.rect(0, footerY - 4, pageWidth, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(`${data.ecole.nom} — ${data.ecole.devise}`, pageWidth / 2, footerY + 1, { align: "center" });

  return doc;
}
