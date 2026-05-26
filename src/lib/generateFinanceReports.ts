import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FCFA = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

interface ReportHeader {
  ecole: string;
  titre: string;
  periode: string;
  date: string;
}

function addHeader(doc: jsPDF, h: ReportHeader) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(h.ecole, w / 2, 18, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Foi, Savoir, Excellence", w / 2, 24, { align: "center" });
  doc.setDrawColor(110, 26, 44);
  doc.setLineWidth(0.5);
  doc.line(15, 28, w - 15, 28);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(h.titre, w / 2, 36, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Période : ${h.periode}`, 15, 43);
  doc.text(`Édité le : ${h.date}`, w - 15, 43, { align: "right" });
}

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    const w = doc.internal.pageSize.getWidth();
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text(`Complexe Scolaire La Providence de Don Orione — Rapport confidentiel`, 15, h - 8);
    doc.text(`Page ${i}/${pages}`, w - 15, h - 8, { align: "right" });
    doc.setTextColor(0);
  }
}

// ── Compte de résultat ──
export interface CompteResultatData {
  recettes: { libelle: string; montant: number }[];
  depenses: { libelle: string; montant: number }[];
}

export function generateCompteResultat(ecole: string, periode: string, data: CompteResultatData) {
  const doc = new jsPDF();
  addHeader(doc, { ecole, titre: "Compte de résultat", periode, date: new Date().toLocaleDateString("fr-FR") });

  const totalRecettes = data.recettes.reduce((s, r) => s + r.montant, 0);
  const totalDepenses = data.depenses.reduce((s, d) => s + d.montant, 0);
  const resultat = totalRecettes - totalDepenses;

  autoTable(doc, {
    startY: 50,
    head: [["RECETTES", "Montant"]],
    body: [
      ...data.recettes.map((r) => [r.libelle, FCFA(r.montant)]),
      [{ content: "Total recettes", styles: { fontStyle: "bold" } }, { content: FCFA(totalRecettes), styles: { fontStyle: "bold" } }],
    ],
    theme: "grid",
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 9 },
  });

  const y1 = (doc as any).lastAutoTable?.finalY ?? 100;

  autoTable(doc, {
    startY: y1 + 8,
    head: [["DÉPENSES", "Montant"]],
    body: [
      ...data.depenses.map((d) => [d.libelle, FCFA(d.montant)]),
      [{ content: "Total dépenses", styles: { fontStyle: "bold" } }, { content: FCFA(totalDepenses), styles: { fontStyle: "bold" } }],
    ],
    theme: "grid",
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 9 },
  });

  const y2 = (doc as any).lastAutoTable?.finalY ?? 160;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const color = resultat >= 0 ? [0, 128, 0] : [200, 0, 0];
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(`Résultat net : ${FCFA(resultat)}`, 15, y2 + 12);
  doc.setTextColor(0);

  addFooter(doc);
  doc.save(`Compte_resultat_${periode.replace(/\s/g, "_")}.pdf`);
}

// ── Flux de trésorerie ──
export interface FluxTresorerieData {
  comptes: { nom: string; solde: number }[];
  mouvements: { date: string; libelle: string; type: string; montant: number; compte: string }[];
}

export function generateFluxTresorerie(ecole: string, periode: string, data: FluxTresorerieData) {
  const doc = new jsPDF();
  addHeader(doc, { ecole, titre: "Flux de trésorerie", periode, date: new Date().toLocaleDateString("fr-FR") });

  const totalSolde = data.comptes.reduce((s, c) => s + c.solde, 0);
  autoTable(doc, {
    startY: 50,
    head: [["Compte", "Solde"]],
    body: [
      ...data.comptes.map((c) => [c.nom, FCFA(c.solde)]),
      [{ content: "Total", styles: { fontStyle: "bold" } }, { content: FCFA(totalSolde), styles: { fontStyle: "bold" } }],
    ],
    theme: "grid",
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 9 },
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
    theme: "grid",
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 8 },
  });

  addFooter(doc);
  doc.save(`Flux_tresorerie_${periode.replace(/\s/g, "_")}.pdf`);
}

// ── Recouvrement scolarité ──
export interface RecouvrementData {
  lignes: { classe: string; effectif: number; montant_du: number; montant_paye: number }[];
}

export function generateRecouvrement(ecole: string, periode: string, data: RecouvrementData) {
  const doc = new jsPDF();
  addHeader(doc, { ecole, titre: "Rapport de recouvrement scolarité", periode, date: new Date().toLocaleDateString("fr-FR") });

  const totalDu = data.lignes.reduce((s, l) => s + l.montant_du, 0);
  const totalPaye = data.lignes.reduce((s, l) => s + l.montant_paye, 0);
  const totalEffectif = data.lignes.reduce((s, l) => s + l.effectif, 0);

  autoTable(doc, {
    startY: 50,
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
    theme: "grid",
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 8 },
  });

  addFooter(doc);
  doc.save(`Recouvrement_scolarite_${periode.replace(/\s/g, "_")}.pdf`);
}

// ── Masse salariale ──
export interface MasseSalarialeData {
  lignes: { nom: string; fonction: string; brut: number; retenues: number; net: number }[];
  mois: string;
}

export function generateMasseSalariale(ecole: string, periode: string, data: MasseSalarialeData) {
  const doc = new jsPDF();
  addHeader(doc, { ecole, titre: `Masse salariale — ${data.mois}`, periode, date: new Date().toLocaleDateString("fr-FR") });

  const totalBrut = data.lignes.reduce((s, l) => s + l.brut, 0);
  const totalRetenues = data.lignes.reduce((s, l) => s + l.retenues, 0);
  const totalNet = data.lignes.reduce((s, l) => s + l.net, 0);

  autoTable(doc, {
    startY: 50,
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
    theme: "grid",
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 8 },
  });

  addFooter(doc);
  doc.save(`Masse_salariale_${data.mois.replace(/\s/g, "_")}.pdf`);
}

// ── Analyse des impayés ──
export interface AnalyseImpayesData {
  lignes: { nom: string; prenom: string; classe: string; montant_du: number; paye: number; jours_retard: number }[];
}

export function generateAnalyseImpayes(ecole: string, data: AnalyseImpayesData) {
  const doc = new jsPDF();
  addHeader(doc, { ecole, titre: "Analyse des impayés (vieillissement)", periode: "À ce jour", date: new Date().toLocaleDateString("fr-FR") });

  const sorted = [...data.lignes].sort((a, b) => b.jours_retard - a.jours_retard);
  const totalReste = sorted.reduce((s, l) => s + (l.montant_du - l.paye), 0);

  autoTable(doc, {
    startY: 50,
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
    theme: "grid",
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 8 },
  });

  addFooter(doc);
  doc.save(`Analyse_impayes_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Budget exécution ──
export interface BudgetExecutionData {
  recettes: { libelle: string; prevu: number; realise: number }[];
  depenses: { libelle: string; prevu: number; realise: number }[];
}

export function generateBudgetExecution(ecole: string, periode: string, data: BudgetExecutionData) {
  const doc = new jsPDF();
  addHeader(doc, { ecole, titre: "Exécution budgétaire", periode, date: new Date().toLocaleDateString("fr-FR") });

  const makeRows = (items: { libelle: string; prevu: number; realise: number }[]) =>
    items.map((i) => {
      const taux = i.prevu > 0 ? ((i.realise / i.prevu) * 100).toFixed(1) + "%" : "—";
      return [i.libelle, FCFA(i.prevu), FCFA(i.realise), FCFA(i.prevu - i.realise), taux];
    });

  autoTable(doc, {
    startY: 50,
    head: [["RECETTES", "Prévu", "Réalisé", "Écart", "Taux"]],
    body: makeRows(data.recettes),
    theme: "grid",
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 8 },
  });

  const y1 = (doc as any).lastAutoTable?.finalY ?? 90;

  autoTable(doc, {
    startY: y1 + 8,
    head: [["DÉPENSES", "Prévu", "Réalisé", "Écart", "Taux"]],
    body: makeRows(data.depenses),
    theme: "grid",
    headStyles: { fillColor: [110, 26, 44] },
    styles: { fontSize: 8 },
  });

  addFooter(doc);
  doc.save(`Budget_execution_${periode.replace(/\s/g, "_")}.pdf`);
}
