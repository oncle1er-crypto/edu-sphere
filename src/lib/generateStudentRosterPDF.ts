import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// =====================================================================
// Générateur PDF : liste des élèves par classe, avec effectif global,
// répartition par sexe, badge "Nouveau" à côté du nom et statut
// d'inscription (finalisée ou non, masquable).
// =====================================================================
//
// "Nouveau" : élève qui n'a AUCUNE fiche dans une année scolaire
// antérieure à l'année active — décision utilisateur du 11/08/2026, après
// constat que `date_inscription` n'est pas fiable (227 fiches de l'année
// active portent la date d'un import en masse du 07/07/2026 comme date
// d'inscription, alors qu'il s'agit en réalité d'élèves déjà présents
// l'année précédente 2025-2026). Le calcul réel (comparaison des
// matricules entre années via `annees_scolaires.debut`) est fait par
// l'appelant — cf. src/hooks/useAnciensMatricules.ts — ce fichier se
// contente d'afficher le booléen `estNouveau` fourni.
//
// "Inscrit" : statut "inscrit" ou "actif" (= a effectué au moins un
// versement, cf. src/lib/eleveStatus.ts). "Non inscrit" = "pre_inscrit"
// (dossier ouvert mais non finalisé). Colonne masquable via l'option
// `afficherStatut`.
//
// Pattern technique dupliqué de src/lib/generateFinanceReports.ts
// (en-tête/pied de page/thème de tableau) plutôt qu'importé, car ces
// helpers n'y sont pas exportés — convention déjà suivie par
// src/pages/cartes/lib/generateClassCardsPDF.ts.

export interface EcoleMeta {
  nom: string;
  devise?: string;
  logoUrl?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
}

interface ReportHeader {
  ecole: EcoleMeta;
  titre: string;
  periode: string;
  date: string;
  logoData?: string | null;
}

async function fetchLogo(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function detectFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")
    ? "JPEG"
    : "PNG";
}

function addHeader(doc: jsPDF, h: ReportHeader): number {
  const w = doc.internal.pageSize.getWidth();
  const M = 15;

  doc.setFillColor(250, 246, 247);
  doc.rect(0, 0, w, 32, "F");

  if (h.logoData) {
    try {
      doc.addImage(h.logoData, detectFormat(h.logoData), M, 6, 22, 22);
    } catch {
      // image non supportée, ignorée
    }
  }

  const textX = h.logoData ? M + 26 : M;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(110, 26, 44);
  doc.text(h.ecole.nom.toUpperCase(), textX, 13);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(90);
  doc.text(h.ecole.devise || "Foi, Savoir, Excellence", textX, 18);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  const contact = [h.ecole.adresse, h.ecole.telephone, h.ecole.email]
    .filter(Boolean)
    .join("  •  ");
  if (contact) doc.text(contact, textX, 23);

  doc.setDrawColor(110, 26, 44);
  doc.setLineWidth(0.8);
  doc.line(M, 32, w - M, 32);
  doc.setDrawColor(252, 227, 77);
  doc.setLineWidth(0.4);
  doc.line(M, 33.2, w - M, 33.2);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text(h.titre, w / 2, 41, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text(`Année : ${h.periode}`, M, 48);
  doc.text(`Édité le : ${h.date}`, w - M, 48, { align: "right" });

  doc.setTextColor(0);
  return 54;
}

function addFooter(doc: jsPDF, ecoleNom: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    const w = doc.internal.pageSize.getWidth();
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    doc.line(15, h - 12, w - 15, h - 12);
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text(`${ecoleNom} — Document confidentiel`, 15, h - 7);
    doc.text(`Page ${i} / ${pages}`, w - 15, h - 7, { align: "right" });
    doc.setTextColor(0);
  }
}

const TABLE_STYLES = {
  theme: "grid" as const,
  headStyles: {
    fillColor: [110, 26, 44] as [number, number, number],
    textColor: 255,
    fontStyle: "bold" as const,
    halign: "left" as const,
  },
  styles: { fontSize: 8.3, cellPadding: 2.2, textColor: 40 },
  alternateRowStyles: { fillColor: [250, 246, 247] as [number, number, number] },
};

function toMeta(ecole: string | EcoleMeta): EcoleMeta {
  return typeof ecole === "string" ? { nom: ecole } : ecole;
}

export interface RosterEleve {
  matricule: string;
  nom: string;
  prenom: string;
  sexe: "M" | "F" | null;
  statut: string;
  /** Aucune fiche pour ce matricule dans une année scolaire antérieure à l'année active. */
  estNouveau: boolean;
}

export interface RosterClasse {
  classeNom: string;
  cycleNom?: string | null;
  eleves: RosterEleve[];
}

export interface RosterData {
  anneeLabel: string;
  classes: RosterClasse[];
}

const estInscrit = (statut: string) => statut === "inscrit" || statut === "actif";

function repartitionSexe(eleves: RosterEleve[]) {
  let g = 0, f = 0, autre = 0;
  for (const e of eleves) {
    if (e.sexe === "M") g++;
    else if (e.sexe === "F") f++;
    else autre++;
  }
  return { g, f, autre };
}

export interface GenerateRosterOptions {
  /** Affiche ou masque la colonne "Statut" (Inscrit / Non inscrit). Par défaut : affichée. */
  afficherStatut?: boolean;
  /** Retourne le document au lieu de le télécharger (utilisé pour l'aperçu). */
  returnDoc?: boolean;
}

export async function generateListeElevesPDF(
  ecole: string | EcoleMeta,
  data: RosterData,
  options: GenerateRosterOptions = {},
): Promise<jsPDF | void> {
  const { afficherStatut = true, returnDoc = false } = options;
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const classesAvecEleves = data.classes.filter((c) => c.eleves.length > 0);
  const uneSeuleClasse = classesAvecEleves.length === 1;
  const titre = uneSeuleClasse
    ? `Liste des élèves — ${classesAvecEleves[0].classeNom}`
    : "Liste des élèves par classe";

  let y = addHeader(doc, {
    ecole: meta,
    titre,
    periode: data.anneeLabel,
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 18) { doc.addPage(); y = 20; }
  };

  const tousEleves = classesAvecEleves.flatMap((c) => c.eleves);
  const totalEffectif = tousEleves.length;
  const { g: totalG, f: totalF } = repartitionSexe(tousEleves);
  const totalNonInscrits = tousEleves.filter((e) => !estInscrit(e.statut)).length;
  const totalNouveaux = tousEleves.filter((e) => e.estNouveau).length;

  // ── Bandeau de synthèse (effectif global + répartition) ──
  const cards: { label: string; value: string; color: [number, number, number] }[] = [
    { label: "Effectif global", value: String(totalEffectif), color: [110, 26, 44] },
    { label: "Garçons", value: String(totalG), color: [30, 90, 160] },
    { label: "Filles", value: String(totalF), color: [170, 40, 110] },
    { label: "Non inscrits", value: String(totalNonInscrits), color: totalNonInscrits > 0 ? [190, 120, 0] : [0, 110, 50] },
    { label: "Nouveaux", value: String(totalNouveaux), color: [0, 110, 50] },
  ];
  const cardGap = 3;
  const cardW = (w - 30 - (cards.length - 1) * cardGap) / cards.length;
  cards.forEach((c, i) => {
    const x = 15 + i * (cardW + cardGap);
    doc.setFillColor(250, 246, 247);
    doc.roundedRect(x, y, cardW, 20, 2, 2, "F");
    doc.setFontSize(6.8);
    doc.setTextColor(90);
    doc.text(c.label, x + 3, y + 6, { maxWidth: cardW - 6 });
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + 3, y + 15, { maxWidth: cardW - 6 });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
  });
  y += 27;

  if (classesAvecEleves.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Aucun élève à afficher.", 15, y + 5);
    doc.setTextColor(0);
  }

  for (const classe of classesAvecEleves) {
    const eleves = [...classe.eleves].sort((a, b) =>
      a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"),
    );
    const { g, f } = repartitionSexe(eleves);

    ensureSpace(20);
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(110, 26, 44);
    const titreClasse = classe.cycleNom ? `${classe.classeNom} — ${classe.cycleNom}` : classe.classeNom;
    doc.text(titreClasse, 15, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(`Effectif : ${eleves.length}  (Garçons : ${g} · Filles : ${f})`, 15, y + 10);
    doc.setTextColor(0);
    y += 14;

    // La colonne "Statut" (index 4) est optionnelle. Le badge "NOUVEAU" est dessiné
    // par-dessus la colonne "Nom & Prénom" (index NOM_COL) via didDrawCell.
    const NOM_COL = 2;
    const head = ["#", "Matricule", "Nom & Prénom", "Sexe"];
    if (afficherStatut) head.push("Statut");

    autoTable(doc, {
      startY: y,
      head: [head],
      body: eleves.map((e, i) => {
        const row = [String(i + 1), e.matricule || "—", `${e.nom} ${e.prenom}`, e.sexe ?? "—"];
        if (afficherStatut) row.push(estInscrit(e.statut) ? "Inscrit" : "Non inscrit");
        return row;
      }),
      columnStyles: {
        0: { cellWidth: 9, halign: "center" },
        1: { cellWidth: 26 },
        3: { cellWidth: 16, halign: "center" },
        ...(afficherStatut ? { 4: { cellWidth: 26 } } : {}),
      },
      didParseCell: (cellData) => {
        if (cellData.section !== "body") return;
        if (afficherStatut && cellData.column.index === 4) {
          const isInscrit = cellData.cell.raw === "Inscrit";
          cellData.cell.styles.textColor = isInscrit ? [0, 110, 50] : [190, 120, 0];
          cellData.cell.styles.fontStyle = "bold";
        }
      },
      didDrawCell: (cellData) => {
        if (cellData.section !== "body" || cellData.column.index !== NOM_COL) return;
        const eleve = eleves[cellData.row.index];
        if (!eleve?.estNouveau) return;
        const cell = cellData.cell;
        const cellDoc = cellData.doc;
        cellDoc.setFont("helvetica", "normal");
        cellDoc.setFontSize(8.3);
        const nameText = `${eleve.nom} ${eleve.prenom}`;
        const textWidth = cellDoc.getTextWidth(nameText);
        const padLeft = cell.padding("left");
        const padRight = cell.padding("right");
        const badgeW = 17;
        const badgeH = 4.4;
        let badgeX = cell.x + padLeft + textWidth + 2;
        const maxX = cell.x + cell.width - padRight - badgeW;
        if (badgeX > maxX) badgeX = Math.max(cell.x + padLeft, maxX);
        const badgeY = cell.y + cell.height / 2 - badgeH / 2;
        cellDoc.setFillColor(0, 110, 50);
        cellDoc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, "F");
        cellDoc.setFontSize(6);
        cellDoc.setTextColor(255);
        cellDoc.text("NOUVEAU", badgeX + badgeW / 2, badgeY + badgeH / 2 + 1.4, { align: "center" });
        cellDoc.setTextColor(0);
        cellDoc.setFontSize(8.3);
      },
      ...TABLE_STYLES,
    });

    y = ((doc as any).lastAutoTable?.finalY ?? y) + 9;
  }

  addFooter(doc, meta.nom);

  const baseNom = uneSeuleClasse
    ? `Liste_eleves_${classesAvecEleves[0].classeNom}`
    : "Liste_eleves_par_classe";
  const nomFichier = `${baseNom}_${new Date().toISOString().slice(0, 10)}.pdf`.replace(/\s+/g, "_");

  if (returnDoc) return doc;
  doc.save(nomFichier);
}
