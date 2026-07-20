import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const y1 = (doc as any).lastAutoTable?.finalY ?? 100;

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

  const y2 = (doc as any).lastAutoTable?.finalY ?? 160;
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

  const y1 = (doc as any).lastAutoTable?.finalY ?? 90;

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

  const y1 = (doc as any).lastAutoTable?.finalY ?? 90;

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
    (a, b) => a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom),
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

  y = (doc as any).lastAutoTable?.finalY ?? y;

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

  const yEnd = (doc as any).lastAutoTable?.finalY ?? y + 40;

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
