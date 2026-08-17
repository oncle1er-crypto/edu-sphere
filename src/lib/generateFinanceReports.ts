import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import { compareEleves } from "@/lib/sortEleves";

/** jspdf-autotable étend jsPDF au runtime avec `lastAutoTable` sans le déclarer dans ses types publics. */
type JsPDFWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

// IMPORTANT: jsPDF's built-in helvetica renders U+202F (narrow no-break space)
// — emitted by Intl fr-FR locale — as "/". We replace it with a regular space.
const FCFA = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ").replace(/\u00a0/g, " ")} FCFA`;

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

// Convert an image URL to a base64 data URL usable by jsPDF
// (exportée : réutilisée par generateFichePaiement.ts pour le logo école ET
// les armoiries nationales, mêmes contraintes de format/CORS)
export async function fetchLogo(url?: string | null): Promise<string | null> {
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

export function detectFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")
    ? "JPEG"
    : "PNG";
}

function addHeader(doc: jsPDF, h: ReportHeader): number {
  const w = doc.internal.pageSize.getWidth();
  const M = 15;

  // Background band (subtle)
  doc.setFillColor(250, 246, 247);
  doc.rect(0, 0, w, 32, "F");

  // Logo
  if (h.logoData) {
    try {
      doc.addImage(h.logoData, detectFormat(h.logoData), M, 6, 22, 22);
    } catch {
      // ignore unsupported images
    }
  }

  // School name + devise
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

  // Brand line
  doc.setDrawColor(110, 26, 44);
  doc.setLineWidth(0.8);
  doc.line(M, 32, w - M, 32);
  doc.setDrawColor(252, 227, 77); // accent
  doc.setLineWidth(0.4);
  doc.line(M, 33.2, w - M, 33.2);

  // Title block
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text(h.titre, w / 2, 41, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text(`Période : ${h.periode}`, M, 48);
  doc.text(`Édité le : ${h.date}`, w - M, 48, { align: "right" });

  doc.setTextColor(0);
  return 54; // y position where content can start
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
  styles: { fontSize: 8.5, cellPadding: 2.5, textColor: 40 },
  alternateRowStyles: { fillColor: [250, 246, 247] as [number, number, number] },
};

function toMeta(ecole: string | EcoleMeta): EcoleMeta {
  return typeof ecole === "string" ? { nom: ecole } : ecole;
}

// ── Compte de résultat ──
export interface CompteResultatData {
  recettes: { libelle: string; montant: number }[];
  depenses: { libelle: string; montant: number }[];
}

export async function generateCompteResultat(
  ecole: string | EcoleMeta,
  periode: string,
  data: CompteResultatData,
) {
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF();
  const startY = addHeader(doc, {
    ecole: meta,
    titre: "Compte de résultat",
    periode,
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const totalRecettes = data.recettes.reduce((s, r) => s + r.montant, 0);
  const totalDepenses = data.depenses.reduce((s, d) => s + d.montant, 0);
  const resultat = totalRecettes - totalDepenses;

  autoTable(doc, {
    startY,
    head: [["RECETTES", "Montant"]],
    body: [
      ...data.recettes.map((r) => [r.libelle, FCFA(r.montant)]),
      [
        { content: "Total recettes", styles: { fontStyle: "bold" } },
        { content: FCFA(totalRecettes), styles: { fontStyle: "bold" } },
      ],
    ],
    columnStyles: { 1: { halign: "right" } },
    ...TABLE_STYLES,
  });

  const y1 = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? 100;

  autoTable(doc, {
    startY: y1 + 8,
    head: [["DÉPENSES", "Montant"]],
    body: [
      ...data.depenses.map((d) => [d.libelle, FCFA(d.montant)]),
      [
        { content: "Total dépenses", styles: { fontStyle: "bold" } },
        { content: FCFA(totalDepenses), styles: { fontStyle: "bold" } },
      ],
    ],
    columnStyles: { 1: { halign: "right" } },
    ...TABLE_STYLES,
  });

  const y2 = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? 160;
  doc.setFillColor(resultat >= 0 ? 235 : 250, resultat >= 0 ? 247 : 235, resultat >= 0 ? 238 : 235);
  doc.rect(15, y2 + 6, doc.internal.pageSize.getWidth() - 30, 12, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const color = resultat >= 0 ? [0, 110, 50] : [180, 0, 0];
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(`Résultat net : ${FCFA(resultat)}`, 20, y2 + 14);
  doc.setTextColor(0);

  addFooter(doc, meta.nom);
  doc.save(`Compte_resultat_${periode.replace(/\s/g, "_")}.pdf`);
}

// ── Flux de trésorerie ──
export interface FluxTresorerieData {
  comptes: { nom: string; solde: number }[];
  mouvements: { date: string; libelle: string; type: string; montant: number; compte: string }[];
}

export async function generateFluxTresorerie(
  ecole: string | EcoleMeta,
  periode: string,
  data: FluxTresorerieData,
) {
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF();
  const startY = addHeader(doc, {
    ecole: meta,
    titre: "Flux de trésorerie",
    periode,
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const totalSolde = data.comptes.reduce((s, c) => s + c.solde, 0);
  autoTable(doc, {
    startY,
    head: [["Compte", "Solde"]],
    body: [
      ...data.comptes.map((c) => [c.nom, FCFA(c.solde)]),
      [
        { content: "Total", styles: { fontStyle: "bold" } },
        { content: FCFA(totalSolde), styles: { fontStyle: "bold" } },
      ],
    ],
    columnStyles: { 1: { halign: "right" } },
    ...TABLE_STYLES,
  });

  const y1 = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? 90;

  const entrees = data.mouvements.filter((m) => m.type === "entree");
  const sorties = data.mouvements.filter((m) => m.type === "sortie");
  const totalEntrees = entrees.reduce((s, m) => s + m.montant, 0);
  const totalSorties = sorties.reduce((s, m) => s + m.montant, 0);

  autoTable(doc, {
    startY: y1 + 8,
    head: [["Date", "Libellé", "Compte", "Entrée", "Sortie"]],
    body: [
      ...data.mouvements.map((m) => [
        m.date,
        m.libelle,
        m.compte,
        m.type === "entree" ? FCFA(m.montant) : "",
        m.type === "sortie" ? FCFA(m.montant) : "",
      ]),
      [
        { content: "Totaux", styles: { fontStyle: "bold" }, colSpan: 3 },
        { content: FCFA(totalEntrees), styles: { fontStyle: "bold" } },
        { content: FCFA(totalSorties), styles: { fontStyle: "bold" } },
      ],
    ],
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 8 },
  });

  addFooter(doc, meta.nom);
  doc.save(`Flux_tresorerie_${periode.replace(/\s/g, "_")}.pdf`);
}

// ── Recouvrement scolarité ──
export interface RecouvrementData {
  lignes: { classe: string; effectif: number; montant_du: number; montant_paye: number }[];
}

export async function generateRecouvrement(
  ecole: string | EcoleMeta,
  periode: string,
  data: RecouvrementData,
) {
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF();
  const startY = addHeader(doc, {
    ecole: meta,
    titre: "Rapport de recouvrement scolarité",
    periode,
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const totalDu = data.lignes.reduce((s, l) => s + l.montant_du, 0);
  const totalPaye = data.lignes.reduce((s, l) => s + l.montant_paye, 0);
  const totalEffectif = data.lignes.reduce((s, l) => s + l.effectif, 0);

  autoTable(doc, {
    startY,
    head: [["Classe", "Effectif", "Montant dû", "Montant payé", "Reste", "Taux"]],
    body: [
      ...data.lignes.map((l) => {
        const reste = l.montant_du - l.montant_paye;
        const taux = l.montant_du > 0 ? ((l.montant_paye / l.montant_du) * 100).toFixed(1) + "%" : "—";
        return [l.classe, String(l.effectif), FCFA(l.montant_du), FCFA(l.montant_paye), FCFA(reste), taux];
      }),
      [
        { content: "TOTAL", styles: { fontStyle: "bold" } },
        { content: String(totalEffectif), styles: { fontStyle: "bold" } },
        { content: FCFA(totalDu), styles: { fontStyle: "bold" } },
        { content: FCFA(totalPaye), styles: { fontStyle: "bold" } },
        { content: FCFA(totalDu - totalPaye), styles: { fontStyle: "bold" } },
        { content: totalDu > 0 ? ((totalPaye / totalDu) * 100).toFixed(1) + "%" : "—", styles: { fontStyle: "bold" } },
      ],
    ],
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 8 },
  });

  addFooter(doc, meta.nom);
  doc.save(`Recouvrement_scolarite_${periode.replace(/\s/g, "_")}.pdf`);
}

// ── Masse salariale ──
export interface MasseSalarialeData {
  lignes: { nom: string; fonction: string; brut: number; retenues: number; net: number }[];
  mois: string;
}

export async function generateMasseSalariale(
  ecole: string | EcoleMeta,
  periode: string,
  data: MasseSalarialeData,
) {
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF();
  const startY = addHeader(doc, {
    ecole: meta,
    titre: `Masse salariale — ${data.mois}`,
    periode,
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const totalBrut = data.lignes.reduce((s, l) => s + l.brut, 0);
  const totalRetenues = data.lignes.reduce((s, l) => s + l.retenues, 0);
  const totalNet = data.lignes.reduce((s, l) => s + l.net, 0);

  autoTable(doc, {
    startY,
    head: [["Enseignant", "Fonction", "Brut", "Retenues", "Net"]],
    body: [
      ...data.lignes.map((l) => [l.nom, l.fonction, FCFA(l.brut), FCFA(l.retenues), FCFA(l.net)]),
      [
        { content: "TOTAL", styles: { fontStyle: "bold" }, colSpan: 2 },
        { content: FCFA(totalBrut), styles: { fontStyle: "bold" } },
        { content: FCFA(totalRetenues), styles: { fontStyle: "bold" } },
        { content: FCFA(totalNet), styles: { fontStyle: "bold" } },
      ],
    ],
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 8 },
  });

  addFooter(doc, meta.nom);
  doc.save(`Masse_salariale_${data.mois.replace(/\s/g, "_")}.pdf`);
}

// ── Analyse des impayés ──
export interface AnalyseImpayesData {
  lignes: { nom: string; prenom: string; classe: string; montant_du: number; paye: number; jours_retard: number }[];
}

export async function generateAnalyseImpayes(ecole: string | EcoleMeta, data: AnalyseImpayesData) {
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF();
  const startY = addHeader(doc, {
    ecole: meta,
    titre: "Analyse des impayés (vieillissement)",
    periode: "À ce jour",
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const sorted = [...data.lignes].sort((a, b) => b.jours_retard - a.jours_retard);
  const totalReste = sorted.reduce((s, l) => s + (l.montant_du - l.paye), 0);

  autoTable(doc, {
    startY,
    head: [["Élève", "Classe", "Montant dû", "Payé", "Reste", "Retard (j)"]],
    body: [
      ...sorted.map((l) => [
        `${l.nom} ${l.prenom}`,
        l.classe,
        FCFA(l.montant_du),
        FCFA(l.paye),
        FCFA(l.montant_du - l.paye),
        String(l.jours_retard),
      ]),
      [
        { content: `${sorted.length} élèves`, styles: { fontStyle: "bold" }, colSpan: 2 },
        { content: "", styles: { fontStyle: "bold" } },
        { content: "", styles: { fontStyle: "bold" } },
        { content: FCFA(totalReste), styles: { fontStyle: "bold" } },
        { content: "", styles: { fontStyle: "bold" } },
      ],
    ],
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "center" },
    },
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 8 },
  });

  addFooter(doc, meta.nom);
  doc.save(`Analyse_impayes_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Budget exécution ──
export interface BudgetExecutionData {
  recettes: { libelle: string; prevu: number; realise: number }[];
  depenses: { libelle: string; prevu: number; realise: number }[];
}

export async function generateBudgetExecution(
  ecole: string | EcoleMeta,
  periode: string,
  data: BudgetExecutionData,
) {
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF();
  const startY = addHeader(doc, {
    ecole: meta,
    titre: "Exécution budgétaire",
    periode,
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const makeRows = (items: { libelle: string; prevu: number; realise: number }[]) =>
    items.map((i) => {
      const taux = i.prevu > 0 ? ((i.realise / i.prevu) * 100).toFixed(1) + "%" : "—";
      return [i.libelle, FCFA(i.prevu), FCFA(i.realise), FCFA(i.prevu - i.realise), taux];
    });

  autoTable(doc, {
    startY,
    head: [["RECETTES", "Prévu", "Réalisé", "Écart", "Taux"]],
    body: makeRows(data.recettes),
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 8 },
  });

  const y1 = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? 90;

  autoTable(doc, {
    startY: y1 + 8,
    head: [["DÉPENSES", "Prévu", "Réalisé", "Écart", "Taux"]],
    body: makeRows(data.depenses),
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 8 },
  });

  addFooter(doc, meta.nom);
  doc.save(`Budget_execution_${periode.replace(/\s/g, "_")}.pdf`);
}

// ── Liste des remises accordées ──
export interface RemiseLigne {
  matricule: string;
  nom: string;
  prenom: string;
  classe: string;
  parent: string;
  telephone: string;
  montant: number;
  motif?: string | null;
}

export interface RemisesData {
  lignes: RemiseLigne[];
}

export async function generateRemisesAccordees(
  ecole: string | EcoleMeta,
  periode: string,
  data: RemisesData,
) {
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = addHeader(doc, {
    ecole: meta,
    titre: "Liste des élèves ayant bénéficié d'une remise",
    periode,
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const sorted = [...data.lignes].sort(
    (a, b) => a.classe.localeCompare(b.classe) || compareEleves(a, b),
  );
  const total = sorted.reduce((s, l) => s + l.montant, 0);

  autoTable(doc, {
    startY,
    head: [["#", "Matricule", "Élève", "Classe", "Parent", "Téléphone", "Remise", "Motif"]],
    body: [
      ...sorted.map((l, i) => [
        String(i + 1),
        l.matricule || "—",
        `${l.nom} ${l.prenom}`,
        l.classe,
        l.parent || "—",
        l.telephone || "—",
        FCFA(l.montant),
        l.motif || "—",
      ]),
      [
        { content: `TOTAL — ${sorted.length} élève(s)`, colSpan: 6, styles: { fontStyle: "bold", halign: "right" } },
        { content: FCFA(total), styles: { fontStyle: "bold", halign: "right", fillColor: [245, 235, 238] } },
        { content: "", styles: { fillColor: [245, 235, 238] } },
      ],
    ],
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 22 },
      5: { cellWidth: 26 },
      6: { halign: "right", cellWidth: 28 },
      7: { cellWidth: 55 },
    },
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 8 },
  });

  addFooter(doc, meta.nom);
  doc.save(`Remises_accordees_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Récapitulatif journalier des paiements ──
export interface RecapJournalierPaiement {
  heure: string;
  reference: string;
  eleve: string;
  matricule: string;
  classe: string;
  tranche: string;
  mode: string;
  montant: number;
}

export interface RecapJournalierData {
  paiements: RecapJournalierPaiement[];
  ventilationModes: { mode: string; total: number; nb: number }[];
  ventilationClasses: { classe: string; total: number; nb: number }[];
  caissier?: string | null;
}

export async function generateRecapPaiementsJournalier(
  ecole: string | EcoleMeta,
  dateISO: string,
  data: RecapJournalierData,
  returnDoc = false,
): Promise<jsPDF | void> {
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF();
  const dateLabel = new Date(dateISO + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  const startY = addHeader(doc, {
    ecole: meta,
    titre: "Récapitulatif des paiements — Journée",
    periode: dateLabel,
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const total = data.paiements.reduce((s, p) => s + p.montant, 0);
  const nb = data.paiements.length;
  const w = doc.internal.pageSize.getWidth();

  // Bandeau synthèse
  doc.setFillColor(250, 246, 247);
  doc.rect(15, startY, w - 30, 16, "F");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text("Encaissements du jour", 20, startY + 6);
  doc.text("Nombre d'opérations", w / 2, startY + 6);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(110, 26, 44);
  doc.text(FCFA(total), 20, startY + 13);
  doc.text(String(nb), w / 2, startY + 13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);

  let y = startY + 22;

  autoTable(doc, {
    startY: y,
    head: [["Heure", "Référence", "Élève", "Matricule", "Classe", "Tr.", "Mode", "Montant"]],
    body: data.paiements.map((p) => [
      p.heure, p.reference, p.eleve, p.matricule, p.classe, p.tranche, p.mode, FCFA(p.montant),
    ]),
    foot: [[
      { content: "TOTAL", colSpan: 7, styles: { halign: "right", fontStyle: "bold" } },
      { content: FCFA(total), styles: { halign: "right", fontStyle: "bold", fillColor: [245, 235, 238] } },
    ]],
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 22 },
      5: { halign: "center", cellWidth: 10 },
      7: { halign: "right" },
    },
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 7.8 },
  });

  y = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? y;

  autoTable(doc, {
    startY: y + 8,
    head: [["Mode de règlement", "Nb", "Total"]],
    body: data.ventilationModes.map((m) => [m.mode, String(m.nb), FCFA(m.total)]),
    foot: [[
      { content: "Total", styles: { fontStyle: "bold" } },
      { content: String(nb), styles: { fontStyle: "bold" } },
      { content: FCFA(total), styles: { fontStyle: "bold", halign: "right" } },
    ]],
    columnStyles: { 1: { halign: "center", cellWidth: 15 }, 2: { halign: "right", cellWidth: 35 } },
    tableWidth: (w - 30) / 2 - 3,
    margin: { left: 15 },
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 8 },
  });

  autoTable(doc, {
    startY: y + 8,
    head: [["Classe", "Nb", "Total"]],
    body: data.ventilationClasses.map((c) => [c.classe, String(c.nb), FCFA(c.total)]),
    foot: [[
      { content: "Total", styles: { fontStyle: "bold" } },
      { content: String(nb), styles: { fontStyle: "bold" } },
      { content: FCFA(total), styles: { fontStyle: "bold", halign: "right" } },
    ]],
    columnStyles: { 1: { halign: "center", cellWidth: 15 }, 2: { halign: "right", cellWidth: 35 } },
    tableWidth: (w - 30) / 2 - 3,
    margin: { left: w / 2 + 3 },
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 8 },
  });

  const yEnd = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? y + 40;

  const sigY = Math.min(yEnd + 20, doc.internal.pageSize.getHeight() - 30);
  doc.setDrawColor(180);
  doc.line(20, sigY, 80, sigY);
  doc.line(w - 80, sigY, w - 20, sigY);
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(`Caissier${data.caissier ? ` : ${data.caissier}` : ""}`, 20, sigY + 5);
  doc.text("Comptable / Direction", w - 80, sigY + 5);
  doc.setTextColor(0);

  addFooter(doc, meta.nom);
  if (returnDoc) return doc;
  doc.save(`Recap_paiements_${dateISO}.pdf`);
}

// ── Export de la liste des dépenses (filtrée par l'écran Dépenses) ──
export interface DepenseExportRow {
  libelle: string;
  categorie: string | null;
  fournisseur_nom?: string;
  montant: number;
  date_depense: string;
  statut: string;
}

const STATUT_DEPENSE_LABEL: Record<string, string> = { en_attente: "En attente", validee: "Validée", rejetee: "Rejetée" };

export async function generateDepensesExport(
  ecole: string | EcoleMeta,
  depenses: DepenseExportRow[],
  opts: { periode: string },
) {
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF();
  const startY = addHeader(doc, {
    ecole: meta,
    titre: "Dépenses",
    periode: opts.periode,
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const total = depenses.reduce((s, d) => s + d.montant, 0);
  const totalValidees = depenses.filter((d) => d.statut === "validee").reduce((s, d) => s + d.montant, 0);
  const sorted = [...depenses].sort((a, b) => b.date_depense.localeCompare(a.date_depense));

  autoTable(doc, {
    startY,
    head: [["Date", "Libellé", "Catégorie", "Fournisseur", "Statut", "Montant"]],
    body: sorted.map((d) => [
      new Date(d.date_depense + "T00:00:00").toLocaleDateString("fr-FR"),
      d.libelle,
      d.categorie ?? "—",
      d.fournisseur_nom ?? "—",
      STATUT_DEPENSE_LABEL[d.statut] ?? d.statut,
      FCFA(d.montant),
    ]),
    foot: [[
      { content: `TOTAL (${depenses.length} dépense${depenses.length > 1 ? "s" : ""})`, colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
      { content: FCFA(total), styles: { halign: "right", fontStyle: "bold", fillColor: [245, 235, 238] } },
    ]],
    showFoot: "lastPage",
    columnStyles: { 5: { halign: "right" } },
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 8 },
  });

  let y = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? startY + 40;
  y += 6;
  const w = doc.internal.pageSize.getWidth();
  doc.setFontSize(8.5);
  doc.setTextColor(90);
  doc.text(`Dont dépenses validées (comptées dans le bilan) : ${FCFA(totalValidees)}`, 15, y);
  doc.setTextColor(0);

  // Ventilation par catégorie (toutes dépenses affichées, tous statuts confondus)
  const catMap = new Map<string, { total: number; nb: number }>();
  for (const d of depenses) {
    const cat = d.categorie || "Non catégorisé";
    const c = catMap.get(cat) ?? { total: 0, nb: 0 };
    c.total += d.montant; c.nb += 1; catMap.set(cat, c);
  }
  const ventilation = Array.from(catMap.entries()).map(([categorie, v]) => ({ categorie, ...v })).sort((a, b) => b.total - a.total);

  if (ventilation.length > 0) {
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [["Catégorie", "Nb", "Total"]],
      body: ventilation.map((v) => [v.categorie, String(v.nb), FCFA(v.total)]),
      foot: [[
        { content: "Total", styles: { fontStyle: "bold" } },
        { content: String(depenses.length), styles: { fontStyle: "bold" } },
        { content: FCFA(total), styles: { fontStyle: "bold", halign: "right" } },
      ]],
      showFoot: "lastPage",
      columnStyles: { 1: { halign: "center", cellWidth: 20 }, 2: { halign: "right", cellWidth: 40 } },
      tableWidth: (w - 30) / 2 - 3,
      margin: { left: 15 },
      ...TABLE_STYLES,
      styles: { ...TABLE_STYLES.styles, fontSize: 8 },
    });
  }

  addFooter(doc, meta.nom);
  doc.save(`Depenses_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Récapitulatif de caisse journalier complet (toutes entrées + dépenses) ──
// Contrairement à generateRecapPaiementsJournalier (scolarité uniquement, avec
// heure/tranche/classe), ce rapport couvre TOUTES les sources d'encaissement
// (scolarité, cantine, transport, tenues, services récurrents/ponctuels, cours
// de vacances — cf. vue v_encaissements_detail) ainsi que les dépenses du jour,
// pour donner une vue de caisse complète de la journée.
export interface RecapCaisseOperation {
  beneficiaire: string;
  matricule?: string | null;
  /** Libellé déjà résolu par l'appelant (ex. modeMeta(mode).label) — ce module ne connaît pas la table des modes. */
  mode: string;
  reference?: string | null;
  montant: number;
}
export interface RecapCaisseSource {
  libelle: string;
  estRemise: boolean;
  operations: RecapCaisseOperation[];
}
export interface RecapCaisseDepense {
  libelle: string;
  categorie: string | null;
  fournisseur: string | null;
  montant: number;
}
export interface RecapCaisseJournalierData {
  sources: RecapCaisseSource[];
  depenses: RecapCaisseDepense[];
}

export interface RecapCaisseOptions {
  /** Date unique au format ISO (mode "jour" historique) : sert à dériver le titre/période/fichier si periodeLabel n'est pas fourni. */
  dateISO?: string;
  /** Libellé de période affiché dans l'en-tête (ex. "lundi 10 août 2026" ou "Semaine du 04/08/2026 au 10/08/2026"). Prioritaire sur dateISO. */
  periodeLabel?: string;
  /** Titre du document (par défaut "Récapitulatif de caisse — Journée"). */
  titre?: string;
  /** Suffixe du nom de fichier, sans extension (par défaut dateISO ou la date du jour). */
  filenameSuffix?: string;
  /** Si false, n'affiche que les sous-totaux par catégorie (pas le détail opération par opération). Par défaut true. */
  avecDetail?: boolean;
  /** Niveau filtré actif, ajouté au libellé de période (ex. "Primaire"). Omis si global. */
  niveauLabel?: string | null;
}

export async function generateRecapCaisseJournalier(
  ecole: string | EcoleMeta,
  optsOrDateISO: string | RecapCaisseOptions,
  data: RecapCaisseJournalierData,
  returnDoc = false,
): Promise<jsPDF | void> {
  const opts: RecapCaisseOptions =
    typeof optsOrDateISO === "string" ? { dateISO: optsOrDateISO } : optsOrDateISO;
  const avecDetail = opts.avecDetail ?? true;
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF();
  const dateLabelDerive = opts.dateISO
    ? new Date(opts.dateISO + "T00:00:00").toLocaleDateString("fr-FR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      })
    : "";
  const periodeLabel = [opts.periodeLabel || dateLabelDerive, opts.niveauLabel || null]
    .filter(Boolean)
    .join(" · ");
  let y = addHeader(doc, {
    ecole: meta,
    titre: opts.titre || "Récapitulatif de caisse — Journée",
    periode: periodeLabel,
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const w = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const entrees = data.sources.filter((s) => !s.estRemise);
  const remises = data.sources.filter((s) => s.estRemise);
  const totalEncaisse = entrees.reduce((s, src) => s + src.operations.reduce((a, o) => a + o.montant, 0), 0);
  const totalRemises = remises.reduce((s, src) => s + src.operations.reduce((a, o) => a + o.montant, 0), 0);
  const totalDepenses = data.depenses.reduce((s, d) => s + d.montant, 0);
  const soldeNet = totalEncaisse - totalDepenses;
  const nbEncaissements = entrees.reduce((n, src) => n + src.operations.length, 0);

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 18) { doc.addPage(); y = 20; }
  };

  // Bandeau synthèse (4 indicateurs)
  const cardW = (w - 30 - 3 * 4) / 4;
  const cards: { label: string; value: string; color: [number, number, number] }[] = [
    { label: "Total encaissé", value: FCFA(totalEncaisse), color: [0, 110, 50] },
    { label: "Remises & bourses", value: FCFA(totalRemises), color: [130, 105, 30] },
    { label: "Dépenses du jour", value: FCFA(totalDepenses), color: [150, 40, 30] },
    { label: "Solde net de caisse", value: FCFA(soldeNet), color: soldeNet >= 0 ? [0, 110, 50] : [180, 0, 0] },
  ];
  cards.forEach((c, i) => {
    const x = 15 + i * (cardW + 4);
    doc.setFillColor(250, 246, 247);
    doc.roundedRect(x, y, cardW, 20, 2, 2, "F");
    doc.setFontSize(7.3);
    doc.setTextColor(90);
    doc.text(c.label, x + 3, y + 6, { maxWidth: cardW - 6 });
    doc.setFontSize(9.3);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + 3, y + 15, { maxWidth: cardW - 6 });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
  });
  y += 27;

  // ── Entrées du jour, groupées par source avec sous-totaux ──
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(110, 26, 44);
  doc.text(`Entrées du jour (${nbEncaissements} opération${nbEncaissements > 1 ? "s" : ""})`, 15, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  y += 4;

  if (nbEncaissements === 0) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Aucun encaissement enregistré ce jour-là.", 15, y + 4);
    doc.setTextColor(0);
    y += 12;
  } else if (!avecDetail) {
    // Mode "sans détail" : une seule ligne par catégorie (nb + sous-total), sans lister chaque opération.
    const rows = entrees
      .filter((src) => src.operations.length > 0)
      .map((src) => {
        const subtotal = src.operations.reduce((a, o) => a + o.montant, 0);
        return [src.libelle, String(src.operations.length), FCFA(subtotal)];
      });
    autoTable(doc, {
      startY: y,
      head: [["Catégorie", "Nb opérations", "Montant"]],
      body: rows,
      foot: [[
        { content: "TOTAL ENCAISSÉ", styles: { halign: "right", fontStyle: "bold" } },
        { content: String(nbEncaissements), styles: { halign: "right", fontStyle: "bold" } },
        { content: FCFA(totalEncaisse), styles: { halign: "right", fontStyle: "bold", fillColor: [245, 235, 238] } },
      ]],
      showFoot: "lastPage",
      columnStyles: { 1: { halign: "center", cellWidth: 30 }, 2: { halign: "right" } },
      ...TABLE_STYLES,
      styles: { ...TABLE_STYLES.styles, fontSize: 8.5 },
    });
    y = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? y + 40;
    if (totalRemises > 0) {
      y += 5;
      doc.setFontSize(8.3);
      doc.setTextColor(90);
      doc.text(`Dont remises & bourses accordées (hors caisse, non comptées dans le total encaissé) : ${FCFA(totalRemises)}`, 15, y);
      doc.setTextColor(0);
    }
    y += 10;
  } else {
    const entreesRows: RowInput[] = [];
    for (const src of entrees) {
      if (src.operations.length === 0) continue;
      entreesRows.push([
        { content: src.libelle.toUpperCase(), colSpan: 5, styles: { fontStyle: "bold", fillColor: [240, 233, 224], textColor: [90, 60, 20] } },
      ]);
      for (const o of src.operations) {
        entreesRows.push([o.beneficiaire, o.matricule ?? "—", o.mode, o.reference ?? "—", FCFA(o.montant)]);
      }
      const subtotal = src.operations.reduce((a, o) => a + o.montant, 0);
      entreesRows.push([
        { content: `Sous-total ${src.libelle}`, colSpan: 4, styles: { fontStyle: "bold", halign: "right", fillColor: [250, 246, 247] } },
        { content: FCFA(subtotal), styles: { fontStyle: "bold", halign: "right", fillColor: [250, 246, 247] } },
      ]);
    }
    autoTable(doc, {
      startY: y,
      head: [["Bénéficiaire", "Matricule", "Mode", "Référence", "Montant"]],
      body: entreesRows,
      foot: [[
        { content: "TOTAL ENCAISSÉ", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
        { content: FCFA(totalEncaisse), styles: { halign: "right", fontStyle: "bold", fillColor: [245, 235, 238] } },
      ]],
      showFoot: "lastPage",
      columnStyles: { 4: { halign: "right" } },
      ...TABLE_STYLES,
      styles: { ...TABLE_STYLES.styles, fontSize: 8 },
    });
    y = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? y + 40;
    if (totalRemises > 0) {
      y += 5;
      doc.setFontSize(8.3);
      doc.setTextColor(90);
      doc.text(`Dont remises & bourses accordées (hors caisse, non comptées dans le total encaissé) : ${FCFA(totalRemises)}`, 15, y);
      doc.setTextColor(0);
    }
    y += 10;
  }

  // ── Ventilation par mode de règlement / par catégorie de dépense (côte à côte) ──
  const modeMap = new Map<string, { total: number; nb: number }>();
  for (const src of entrees) {
    for (const o of src.operations) {
      const m = modeMap.get(o.mode) ?? { total: 0, nb: 0 };
      m.total += o.montant; m.nb += 1; modeMap.set(o.mode, m);
    }
  }
  const ventilationModes = Array.from(modeMap.entries()).map(([mode, v]) => ({ mode, ...v })).sort((a, b) => b.total - a.total);

  const catMap = new Map<string, { total: number; nb: number }>();
  for (const d of data.depenses) {
    const cat = d.categorie || "Non catégorisé";
    const c = catMap.get(cat) ?? { total: 0, nb: 0 };
    c.total += d.montant; c.nb += 1; catMap.set(cat, c);
  }
  const ventilationCategories = Array.from(catMap.entries()).map(([categorie, v]) => ({ categorie, ...v })).sort((a, b) => b.total - a.total);

  if (ventilationModes.length > 0 || ventilationCategories.length > 0) {
    ensureSpace(14 + Math.max(ventilationModes.length, ventilationCategories.length) * 6);
    if (ventilationModes.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Mode de règlement", "Nb", "Total"]],
        body: ventilationModes.map((m) => [m.mode, String(m.nb), FCFA(m.total)]),
        foot: [[
          { content: "Total", styles: { fontStyle: "bold" } },
          { content: String(nbEncaissements), styles: { fontStyle: "bold" } },
          { content: FCFA(totalEncaisse), styles: { fontStyle: "bold", halign: "right" } },
        ]],
        showFoot: "lastPage",
        columnStyles: { 1: { halign: "center", cellWidth: 15 }, 2: { halign: "right", cellWidth: 35 } },
        tableWidth: (w - 30) / 2 - 3,
        margin: { left: 15 },
        ...TABLE_STYLES,
        styles: { ...TABLE_STYLES.styles, fontSize: 8 },
      });
    }
    if (ventilationCategories.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Dépenses — Catégorie", "Nb", "Total"]],
        body: ventilationCategories.map((c) => [c.categorie, String(c.nb), FCFA(c.total)]),
        foot: [[
          { content: "Total", styles: { fontStyle: "bold" } },
          { content: String(data.depenses.length), styles: { fontStyle: "bold" } },
          { content: FCFA(totalDepenses), styles: { fontStyle: "bold", halign: "right" } },
        ]],
        showFoot: "lastPage",
        columnStyles: { 1: { halign: "center", cellWidth: 15 }, 2: { halign: "right", cellWidth: 35 } },
        tableWidth: (w - 30) / 2 - 3,
        margin: { left: w / 2 + 3 },
        ...TABLE_STYLES,
        styles: { ...TABLE_STYLES.styles, fontSize: 8 },
      });
    }
    const finalYModes = ventilationModes.length > 0 ? (doc as JsPDFWithAutoTable).lastAutoTable?.finalY : undefined;
    y = Math.max(finalYModes ?? y + 20, y + 20) + 8;
  }

  // ── Détail des dépenses du jour (omis en mode "sans détail" : la
  // ventilation par catégorie ci-dessus suffit alors) ──
  if (avecDetail && data.depenses.length > 0) {
    ensureSpace(20);
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(110, 26, 44);
    doc.text(`Dépenses du jour (${data.depenses.length})`, 15, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Libellé", "Catégorie", "Fournisseur", "Montant"]],
      body: data.depenses.map((d) => [d.libelle, d.categorie ?? "—", d.fournisseur ?? "—", FCFA(d.montant)]),
      foot: [[
        { content: "TOTAL DÉPENSES", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } },
        { content: FCFA(totalDepenses), styles: { halign: "right", fontStyle: "bold", fillColor: [245, 235, 238] } },
      ]],
      showFoot: "lastPage",
      columnStyles: { 3: { halign: "right" } },
      ...TABLE_STYLES,
      styles: { ...TABLE_STYLES.styles, fontSize: 8 },
    });
    y = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? y + 40;
  }

  // ── Bandeau solde net ──
  ensureSpace(20);
  y += 6;
  doc.setFillColor(soldeNet >= 0 ? 235 : 250, soldeNet >= 0 ? 247 : 235, soldeNet >= 0 ? 238 : 235);
  doc.rect(15, y, w - 30, 12, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const netColor = soldeNet >= 0 ? [0, 110, 50] : [180, 0, 0];
  doc.setTextColor(netColor[0], netColor[1], netColor[2]);
  // U+2212 (signe moins) n'est pas rendu par la police helvetica intégrée de jsPDF
  // (même limitation que U+202F documentée en tête de fichier) : trait d'union ASCII à la place.
  doc.text(`Solde net de caisse du jour (encaissé - dépenses) : ${FCFA(soldeNet)}`, 20, y + 8);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  y += 20;

  // ── Signatures ──
  ensureSpace(14);
  const sigY = Math.min(y + 8, pageH - 16);
  doc.setDrawColor(180);
  doc.line(20, sigY, 80, sigY);
  doc.line(w - 80, sigY, w - 20, sigY);
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text("Caissier", 20, sigY + 5);
  doc.text("Comptable / Direction", w - 80, sigY + 5);
  doc.setTextColor(0);

  addFooter(doc, meta.nom);
  if (returnDoc) return doc;
  const suffix = opts.filenameSuffix || opts.dateISO || new Date().toISOString().slice(0, 10);
  doc.save(`Recap_caisse_${suffix}.pdf`);
}

// ── Bon de sortie de caisse ──
// Justificatif imprimable d'une dépense VALIDÉE (une seule pièce, pas un
// export de liste). Le numéro (BSC-YYYY-00001) est assigné par le trigger DB
// public.assign_numero_bon_sortie() au moment de la validation — jamais
// généré côté client, pour garantir l'unicité et la séquentialité même en
// cas de validations concurrentes. Distinct du préfixe BS- déjà utilisé par
// billets_sortie (autorisations de sortie d'élève/personnel, module Vie
// scolaire) pour éviter toute confusion entre les deux documents.
//
// Ne mentionne pas le nom du validateur (valide_par n'est qu'un UUID côté
// dépenses — la RLS sur `profiles` empêche aujourd'hui de le résoudre en nom
// affichable ailleurs dans l'app ; on ne l'invente pas ici). Les lignes de
// signature servent de preuve papier à la place.
export interface BonSortieData {
  numero: string;
  libelle: string;
  categorie: string | null;
  fournisseur_nom?: string | null;
  montant: number;
  date_depense: string;
  niveau_label?: string | null;
  notes?: string | null;
  valide_le: string;
}

export async function generateBonSortiePDF(ecole: string | EcoleMeta, data: BonSortieData) {
  const meta = toMeta(ecole);
  const logoData = await fetchLogo(meta.logoUrl);
  const doc = new jsPDF();
  const startY = addHeader(doc, {
    ecole: meta,
    titre: "Bon de sortie de caisse",
    periode: `Validé le ${new Date(data.valide_le).toLocaleDateString("fr-FR")}`,
    date: new Date().toLocaleDateString("fr-FR"),
    logoData,
  });

  const w = doc.internal.pageSize.getWidth();
  let y = startY + 2;

  // Numéro de pièce — mis en avant comme identifiant principal du document.
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(110, 26, 44);
  doc.text(`N° ${data.numero}`, w / 2, y, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  y += 12;

  // Bandeau montant
  doc.setFillColor(250, 246, 247);
  doc.roundedRect(15, y, w - 30, 22, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text("Montant", 20, y + 8);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(110, 26, 44);
  doc.text(FCFA(data.montant), 20, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  y += 32;

  const field = (label: string, value: string) => {
    doc.setFontSize(8.5);
    doc.setTextColor(120);
    doc.text(label, 20, y);
    doc.setFontSize(10.5);
    doc.setTextColor(20);
    doc.text(value || "—", 20, y + 6);
    doc.setTextColor(0);
    y += 14;
  };

  field("Motif / libellé", data.libelle);
  field("Catégorie", data.categorie ?? "—");
  field("Bénéficiaire / fournisseur", data.fournisseur_nom ?? "—");
  field("Niveau imputé", data.niveau_label ?? "Commun");
  field("Date de la dépense", new Date(data.date_depense + "T00:00:00").toLocaleDateString("fr-FR"));
  if (data.notes) field("Notes", data.notes);

  const pageH = doc.internal.pageSize.getHeight();
  const sigY = Math.max(y + 20, pageH - 40);
  doc.setDrawColor(180);
  doc.line(20, sigY, 85, sigY);
  doc.line(w - 85, sigY, w - 20, sigY);
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text("Remis par (caissier / comptable)", 20, sigY + 5);
  doc.text("Reçu par (bénéficiaire)", w - 85, sigY + 5);
  doc.setTextColor(0);

  addFooter(doc, meta.nom);
  doc.save(`Bon_sortie_${data.numero}.pdf`);
}
