import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { urlToDataUrl } from "./imageCompression";
import { fmt2, appreciationMatiere, categorieBulletin } from "./bulletinHelpers";

// ── Données ──────────────────────────────────────────────────────────────────
export interface BulletinSubjectRow {
  matiere: string;
  categorie?: string | null;
  note: number | null;
  coefficient: number;
  moyenne_classe?: number | null; // optionnel
  rang_matiere?: string | null;   // ex: "1er", "2e"
  appreciation?: string | null;
  professeur?: string | null;
}

export interface BulletinAssiduite {
  heures_absence: number;
  absences_justifiees: number;
  absences_non_justifiees: number;
  retards: number;
}

export interface BulletinDecisions {
  appreciation_generale?: string;
  tableau_honneur?: boolean;
  felicitations?: boolean;
  encouragements?: boolean;
  avertissement_travail?: boolean;
  avertissement_conduite?: boolean;
  blame_travail?: boolean;
  blame_conduite?: boolean;
  decision?: string;          // ex: "Admis(e)"
  decision_detail?: string;   // ex: "Passe en classe supérieure"
}

export interface BulletinData {
  ecole: {
    nom: string;
    devise?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    code?: string;
    logo_url?: string | null;
    direction_regionale?: string;
  };
  eleve: {
    nom: string;
    prenom: string;
    matricule: string;
    date_naissance?: string;
    lieu_naissance?: string;
    nationalite?: string;
    sexe?: string;
    photo_url?: string | null;
    redoublant?: boolean;
    regime?: string;          // Externe / Interne / Demi-pensionnaire
    interne?: boolean;
    affecte?: boolean;
  };
  classe: string;
  effectif_classe?: number;
  annee: string;
  periode: string;            // ex: "1er Trimestre"
  matieres: BulletinSubjectRow[];
  moyenne_generale: number;
  rang: number;
  total_eleves: number;
  mention: string;
  assiduite?: BulletinAssiduite;
  resultats_classe?: {
    moyenne_classe?: number;
    moyenne_max?: number;
    moyenne_min?: number;
    taux_reussite?: number;
  };
  decisions?: BulletinDecisions;
  signataires?: {
    professeur_principal?: string;
    chef_etablissement?: string;
  };
  verification_code?: string;
}

// ── Constantes design ────────────────────────────────────────────────────────
const GREEN: [number, number, number] = [27, 94, 32];     // vert institutionnel
const GREEN_SOFT: [number, number, number] = [232, 245, 233];
const GREY_LINE: [number, number, number] = [210, 210, 210];
const GREY_TEXT: [number, number, number] = [90, 90, 90];

// Encodage helper pour caractères non supportés par helvetica
const safe = (s: string | null | undefined): string =>
  (s ?? "").replace(/[\u2019\u2018]/g, "'").replace(/[\u201C\u201D]/g, '"');

// ── Générateur principal ─────────────────────────────────────────────────────
export async function generateBulletinPDF(data: BulletinData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  // ════════ EN-TÊTE 3 COLONNES ════════
  let y = margin;
  const colLeftW = 55;
  const colRightW = 70;
  const colCenterW = pageW - 2 * margin - colLeftW - colRightW;

  // Colonne gauche : ministère + école
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("REPUBLIQUE DE COTE D'IVOIRE", margin, y + 4);
  doc.text("MINISTERE DE L'EDUCATION NATIONALE", margin, y + 8);
  doc.text("ET DE L'ALPHABETISATION", margin, y + 11.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GREY_TEXT);
  doc.text(safe(data.ecole.direction_regionale ?? "Direction Regionale d'Abidjan"), margin, y + 16);

  // Logo + nom école
  const logoBottomY = y + 22;
  if (data.ecole.logo_url) {
    const dataUrl = await urlToDataUrl(data.ecole.logo_url);
    if (dataUrl) {
      try {
        const fmt = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, fmt, margin, y + 20, 14, 14);
      } catch { /* ignore */ }
    }
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("ETABLISSEMENT", margin + 16, y + 23);
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text(safe(data.ecole.nom), margin + 16, y + 27, { maxWidth: colLeftW - 16 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GREY_TEXT);
  if (data.ecole.adresse) {
    doc.text(safe(data.ecole.adresse), margin + 16, y + 32, { maxWidth: colLeftW - 16 });
  }

  // Colonne centre : Titre
  const cxCenter = margin + colLeftW + colCenterW / 2;
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("BULLETIN DE NOTES", cxCenter, y + 8, { align: "center" });
  doc.text("TRIMESTRIEL", cxCenter, y + 15, { align: "center" });

  // Bandeau trimestre
  doc.setFillColor(...GREEN);
  doc.roundedRect(margin + colLeftW + 8, y + 19, colCenterW - 16, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(safe(data.periode).toUpperCase(), cxCenter, y + 24, { align: "center" });

  doc.setTextColor(...GREEN);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`ANNEE SCOLAIRE ${safe(data.annee)}`, cxCenter, y + 31, { align: "center" });

  // Colonne droite : infos contact
  const xRight = margin + colLeftW + colCenterW;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const rightLines: Array<[string, string]> = [
    ["Code etablissement", data.ecole.code ?? "-"],
    ["Classe", data.classe],
    ["Regime", data.eleve.regime ?? "Externe"],
    ["Telephone", data.ecole.telephone ?? "-"],
    ["Email", data.ecole.email ?? "-"],
  ];
  rightLines.forEach((row, i) => {
    const ry = y + 4 + i * 5.5;
    doc.setTextColor(...GREY_TEXT);
    doc.text(`${row[0]} :`, xRight, ry);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(safe(row[1]), xRight + 28, ry, { maxWidth: colRightW - 28 });
    doc.setFont("helvetica", "normal");
  });

  // Ligne séparation
  y = Math.max(logoBottomY + 16, y + 36);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);

  // ════════ IDENTITE ELEVE ════════
  y += 2;
  const idH = 26;
  const photoW = 22;
  const photoH = 26;
  const photoX = pageW - margin - photoW - 1;

  doc.setDrawColor(...GREY_LINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageW - 2 * margin, idH, 1.5, 1.5, "S");

  // Photo
  if (data.eleve.photo_url) {
    const dataUrl = await urlToDataUrl(data.eleve.photo_url);
    if (dataUrl) {
      try {
        const fmt = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, fmt, photoX, y, photoW, photoH);
        doc.setDrawColor(...GREY_LINE);
        doc.rect(photoX, y, photoW, photoH);
      } catch { /* ignore */ }
    }
  } else {
    doc.setFillColor(245, 245, 245);
    doc.rect(photoX, y, photoW, photoH, "F");
  }

  // Champs identité (3 colonnes)
  const idCols = [margin + 3, margin + 70, margin + 130];
  const labelColor = GREEN;
  const drawIdLine = (col: number, line: number, label: string, value: string) => {
    const cy = y + 5 + line * 5.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...labelColor);
    doc.text(label, idCols[col], cy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(safe(value || "-"), idCols[col] + (label.length > 12 ? 30 : 22), cy);
  };

  drawIdLine(0, 0, "NOM ET PRENOMS :", `${data.eleve.nom} ${data.eleve.prenom}`);
  drawIdLine(0, 1, "MATRICULE :", data.eleve.matricule);
  drawIdLine(0, 2, "NE(E) LE :", data.eleve.date_naissance ?? "-");
  drawIdLine(0, 3, "NATIONALITE :", data.eleve.nationalite ?? "Ivoirienne");

  drawIdLine(1, 1, "SEXE :", data.eleve.sexe === "F" ? "F" : data.eleve.sexe === "M" ? "M" : "-");
  drawIdLine(1, 2, "A :", data.eleve.lieu_naissance ?? "-");
  drawIdLine(1, 3, "CLASSE :", data.classe);

  drawIdLine(2, 1, "REDOUBLANT :", data.eleve.redoublant ? "Oui" : "Non");
  drawIdLine(2, 2, "REGIME :", data.eleve.regime ?? "Externe");
  drawIdLine(2, 3, "INTERNE :", data.eleve.interne ? "Oui" : "Non");

  y += idH + 3;

  // ════════ TABLEAU DES NOTES ════════
  // Construction : matières par catégorie + bilan + totaux
  const byCat: Record<"LETTRES" | "SCIENCES" | "AUTRES", BulletinSubjectRow[]> = {
    LETTRES: [], SCIENCES: [], AUTRES: [],
  };
  for (const m of data.matieres) {
    const cat = categorieBulletin(m.categorie, m.matiere);
    byCat[cat].push(m);
  }

  let totalCoef = 0;
  let totalPoints = 0;
  let numero = 0;

  const body: any[] = [];
  const bilanRows: number[] = [];
  const sectionRows: { idx: number; label: string }[] = [];

  const pushCategorie = (label: string, rows: BulletinSubjectRow[]) => {
    if (rows.length === 0) return;
    let catCoef = 0;
    let catPoints = 0;
    rows.forEach((m) => {
      numero += 1;
      const moy = m.note;
      const points = moy !== null && moy !== undefined ? moy * m.coefficient : null;
      if (points !== null) { catCoef += m.coefficient; catPoints += points; }
      body.push([
        String(numero),
        safe(m.matiere),
        fmt2(moy),
        String(m.coefficient),
        fmt2(points),
        safe(m.rang_matiere ?? "-"),
        safe(m.appreciation ?? appreciationMatiere(moy)),
        safe(m.professeur ?? "-"),
      ]);
    });
    const catMoy = catCoef > 0 ? catPoints / catCoef : null;
    body.push([
      "",
      `BILAN ${label}`,
      fmt2(catMoy),
      String(catCoef),
      fmt2(catPoints),
      "-", "-", "-",
    ]);
    bilanRows.push(body.length - 1);
    totalCoef += catCoef;
    totalPoints += catPoints;
  };

  pushCategorie("LETTRES", byCat.LETTRES);
  pushCategorie("SCIENCES", byCat.SCIENCES);
  pushCategorie("AUTRES", byCat.AUTRES);

  // Ligne TOTAUX
  body.push(["", "TOTAUX", "", String(totalCoef), fmt2(totalPoints), "-", "-", "-"]);
  const totauxRowIdx = body.length - 1;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["N°", "DISCIPLINES", "MOY. /20", "COEF.", "MOY. x COEF.", "RANG", "APPRECIATION", "PROFESSEUR"]],
    body,
    theme: "grid",
    styles: {
      fontSize: 7.8,
      cellPadding: 1.6,
      lineColor: GREY_LINE,
      lineWidth: 0.15,
      textColor: [0, 0, 0],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: GREEN,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.8,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { cellWidth: 46 },
      2: { halign: "center", cellWidth: 17 },
      3: { halign: "center", cellWidth: 12 },
      4: { halign: "center", cellWidth: 19 },
      5: { halign: "center", cellWidth: 12 },
      6: { halign: "center", cellWidth: 28, fontStyle: "italic" },
      7: { halign: "left", cellWidth: 48 },
    },
    didParseCell: (hookData) => {
      const ri = hookData.row.index;
      if (bilanRows.includes(ri)) {
        hookData.cell.styles.fillColor = GREEN_SOFT;
        hookData.cell.styles.fontStyle = "bold";
      }
      if (ri === totauxRowIdx) {
        hookData.cell.styles.fillColor = GREEN;
        hookData.cell.styles.textColor = [255, 255, 255];
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fontSize = 8.5;
      }
    },
  });

  y = (doc as any).lastAutoTable?.finalY ?? y + 60;
  y += 3;

  // ════════ 3 BOITES : ASSIDUITE / MOYENNE TRIM / RESULTATS CLASSE ════════
  const boxW = (pageW - 2 * margin - 4) / 3;
  const boxH = 30;
  const boxes = [
    { x: margin, title: "ASSIDUITE" },
    { x: margin + boxW + 2, title: "MOYENNE TRIMESTRIELLE" },
    { x: margin + 2 * (boxW + 2), title: "RESULTATS DE LA CLASSE" },
  ];

  boxes.forEach((b) => {
    doc.setDrawColor(...GREY_LINE);
    doc.roundedRect(b.x, y, boxW, boxH, 1.2, 1.2, "S");
    doc.setFillColor(...GREEN_SOFT);
    doc.rect(b.x, y, boxW, 5.5, "F");
    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.text(b.title, b.x + boxW / 2, y + 4, { align: "center" });
  });

  // Box 1 : Assiduité
  const a = data.assiduite ?? { heures_absence: 0, absences_justifiees: 0, absences_non_justifiees: 0, retards: 0 };
  const ass: Array<[string, string]> = [
    ["Heures d'absence", String(a.heures_absence).padStart(2, "0")],
    ["Absences justifiees", String(a.absences_justifiees).padStart(2, "0")],
    ["Absences non justifiees", String(a.absences_non_justifiees).padStart(2, "0")],
    ["Retards", String(a.retards).padStart(2, "0")],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  ass.forEach((row, i) => {
    const ly = y + 9 + i * 4.8;
    doc.setTextColor(...GREY_TEXT);
    doc.text(row[0], margin + 2, ly);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], margin + boxW - 4, ly, { align: "right" });
    doc.setFont("helvetica", "normal");
  });

  // Box 2 : Moyenne trimestrielle
  const bx = margin + boxW + 2;
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(fmt2(data.moyenne_generale), bx + boxW / 2, y + 16, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(...GREY_TEXT);
  doc.text("/20", bx + boxW / 2 + 12, y + 16);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text(`RANG :  ${data.rang}${data.rang === 1 ? "er" : "e"} sur ${data.total_eleves}`, bx + boxW / 2, y + 22, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text(`MENTION : ${safe(data.mention)}`, bx + boxW / 2, y + 27, { align: "center" });

  // Box 3 : Résultats classe
  const cx = margin + 2 * (boxW + 2);
  const r = data.resultats_classe ?? {};
  const res: Array<[string, string]> = [
    ["Moyenne generale", fmt2(r.moyenne_classe ?? null)],
    ["Moyenne la plus forte", fmt2(r.moyenne_max ?? null)],
    ["Moyenne la plus faible", fmt2(r.moyenne_min ?? null)],
    ["Taux de reussite", r.taux_reussite !== undefined ? `${r.taux_reussite.toFixed(0)} %` : "-"],
  ];
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  res.forEach((row, i) => {
    const ly = y + 9 + i * 4.8;
    doc.setTextColor(...GREY_TEXT);
    doc.text(row[0], cx + 2, ly);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], cx + boxW - 4, ly, { align: "right" });
    doc.setFont("helvetica", "normal");
  });

  y += boxH + 3;

  // ════════ APPRECIATION + DECISION ════════
  const apprW = (pageW - 2 * margin - 4) * 0.58;
  const decW = (pageW - 2 * margin - 4) * 0.42;
  const apprH = 30;

  doc.setDrawColor(...GREY_LINE);
  doc.roundedRect(margin, y, apprW, apprH, 1.2, 1.2, "S");
  doc.setFillColor(...GREEN_SOFT);
  doc.rect(margin, y, apprW, 5.5, "F");
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.text("APPRECIATION DU CONSEIL DE CLASSE", margin + apprW / 2, y + 4, { align: "center" });

  const d = data.decisions ?? {};
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(safe(d.appreciation_generale ?? "-"), margin + apprW / 2, y + 11, { align: "center" });

  // Cases à cocher
  const checks: Array<[string, boolean | undefined]> = [
    ["Tableau d'honneur", d.tableau_honneur],
    ["Felicitations", d.felicitations],
    ["Encouragements", d.encouragements],
    ["Avertissement travail", d.avertissement_travail],
    ["Avertissement conduite", d.avertissement_conduite],
    ["Blame travail", d.blame_travail],
    ["Blame conduite", d.blame_conduite],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const checkColW = apprW / 3;
  checks.forEach((row, i) => {
    const col = i % 3;
    const ligne = Math.floor(i / 3);
    const cxBox = margin + 3 + col * checkColW;
    const cyBox = y + 17 + ligne * 5;
    doc.setDrawColor(...GREY_TEXT);
    doc.rect(cxBox, cyBox - 2.5, 2.5, 2.5);
    if (row[1]) {
      doc.setTextColor(...GREEN);
      doc.setFont("helvetica", "bold");
      doc.text("v", cxBox + 0.5, cyBox - 0.5);
      doc.setFont("helvetica", "normal");
    }
    doc.setTextColor(0, 0, 0);
    doc.text(safe(row[0]), cxBox + 4, cyBox);
  });

  // Décision
  const xDec = margin + apprW + 4;
  doc.setDrawColor(...GREY_LINE);
  doc.roundedRect(xDec, y, decW, apprH, 1.2, 1.2, "S");
  doc.setFillColor(...GREEN_SOFT);
  doc.rect(xDec, y, decW, 5.5, "F");
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.text("DECISION DU CONSEIL DE CLASSE", xDec + decW / 2, y + 4, { align: "center" });

  doc.setTextColor(...GREEN);
  doc.setFontSize(14);
  doc.text(safe(d.decision ?? "-"), xDec + decW / 2, y + 17, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  if (d.decision_detail) {
    doc.text(safe(d.decision_detail), xDec + decW / 2, y + 23, { align: "center" });
  }

  y += apprH + 3;

  // ════════ SIGNATURES + QR ════════
  const sigH = 26;
  doc.setDrawColor(...GREY_LINE);
  doc.roundedRect(margin, y, pageW - 2 * margin, sigH, 1.2, 1.2, "S");

  const sigCol = (pageW - 2 * margin) / 4;
  const labels = [
    { t: "Le Professeur Principal", n: data.signataires?.professeur_principal ?? "-" },
    { t: "Le Chef d'Etablissement", n: data.signataires?.chef_etablissement ?? "-" },
  ];
  labels.forEach((l, i) => {
    const sx = margin + i * sigCol + sigCol / 2;
    doc.setTextColor(...GREY_TEXT);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text(l.t, sx, y + 5, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(safe(l.n).toUpperCase(), sx, y + 10, { align: "center" });
  });

  // Date d'édition
  const dateX = margin + 2 * sigCol + sigCol / 2;
  doc.setTextColor(...GREY_TEXT);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text("Date d'edition", dateX, y + 5, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(new Date().toLocaleDateString("fr-FR"), dateX, y + 10, { align: "center" });

  // QR Code de vérification
  if (data.verification_code) {
    try {
      const qrUrl = await QRCode.toDataURL(data.verification_code, { width: 200, margin: 0 });
      doc.addImage(qrUrl, "PNG", pageW - margin - 22, y + 2, 20, 20);
      doc.setTextColor(...GREY_TEXT);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6);
      doc.text("Verification", pageW - margin - 12, y + 24, { align: "center" });
    } catch { /* ignore */ }
  }

  // ════════ MENTION LEGALE ════════
  doc.setTextColor(...GREY_TEXT);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text(
    "Ce bulletin est un document officiel. Toute falsification ou alteration est passible de poursuites judiciaires.",
    pageW / 2,
    pageH - 5,
    { align: "center" }
  );

  return doc;
}
