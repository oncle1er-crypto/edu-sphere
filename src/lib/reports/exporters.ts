import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface EcoleHeaderInfo {
  nom?: string | null;
  sigle?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  devise?: string | null;
}

export interface PdfSummaryMode {
  label: string;
  count: number;
  total: number;
}

export interface PdfSummary {
  /** Répartition par mode de paiement à afficher sous le tableau. */
  modes?: PdfSummaryMode[];
  /** Montant total à mettre en valeur (encadré coloré). */
  grandTotal?: number;
  /** Libellé du total (défaut "TOTAL ENCAISSÉ"). */
  grandTotalLabel?: string;
  /** Nombre d'opérations (facultatif). */
  operationsCount?: number;
}

export interface PdfGroupBy {
  /** Index de la colonne servant à grouper (les valeurs deviennent des titres de section). */
  columnIndex: number;
  /** Libellé utilisé devant la valeur du groupe. Ex: "Classe". */
  label?: string;
  /** Retire la colonne de groupe du tableau (activé par défaut). */
  hideColumn?: boolean;
  /** Force un saut de page entre chaque groupe (activé par défaut). */
  pageBreak?: boolean;
}

export interface ExportPayload {
  title: string;
  filename: string; // sans extension
  columns: string[];
  rows: (string | number | null | undefined)[][];
  sousTitre?: string;
  ecole?: EcoleHeaderInfo | null;
  orientation?: "portrait" | "landscape";
  pdfSummary?: PdfSummary;
  /** Groupement PDF : une section (+ page) par valeur distincte de la colonne. */
  pdfGroupBy?: PdfGroupBy;
}

// ---------- CSV ----------
export function exportRowsCSV(p: ExportPayload) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [p.columns.map(esc).join(","), ...p.rows.map((r) => r.map(esc).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${p.filename}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Excel ----------
export function exportRowsXLSX(p: ExportPayload) {
  const aoa: (string | number | null | undefined)[][] = [p.columns, ...p.rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // largeurs auto approx
  ws["!cols"] = p.columns.map((c, i) => {
    const maxLen = Math.max(
      c.length,
      ...p.rows.map((r) => (r[i] == null ? 0 : String(r[i]).length)),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Données");
  if (p.ecole?.nom || p.sousTitre) {
    const metaWs = XLSX.utils.aoa_to_sheet([
      ["Rapport", p.title],
      ["École", p.ecole?.nom ?? ""],
      ["Sigle", p.ecole?.sigle ?? ""],
      ["Période / filtres", p.sousTitre ?? ""],
      ["Généré le", new Date().toLocaleString("fr-FR")],
    ]);
    XLSX.utils.book_append_sheet(wb, metaWs, "Info");
  }
  XLSX.writeFile(wb, `${p.filename}.xlsx`);
}

// ---------- PDF ----------
async function loadLogo(url?: string | null): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (!url) return null;
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

// ---------- Helpers de mise en forme ----------
const BORDEAUX: [number, number, number] = [110, 26, 44];
const JAUNE: [number, number, number] = [252, 227, 77];
const GRIS_LIGNE: [number, number, number] = [249, 246, 247];

const MONEY_RE = /(montant|dû|du$|dus|encaiss|remise|reste|solde|total|frais|pay|recette|dépense|depense|scolarit|honorair|prix|net|caisse|versement|impay)/i;
const PERCENT_RE = /(%|taux|pourcent)/i;
const COUNT_RE = /(effectif|nombre|nb|quantit|stock|élèves|eleves|jours)/i;

function isNumericValue(v: unknown): boolean {
  if (v == null || v === "") return false;
  if (typeof v === "number") return Number.isFinite(v);
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  return s !== "" && !Number.isNaN(Number(s));
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Séparateur de milliers par espace simple (compatible Helvetica jsPDF). */
function fmtNum(n: number, decimals = 0): string {
  const v = Number(n) || 0;
  const fixed = Math.abs(v).toFixed(decimals);
  const [intPart, dec] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${v < 0 ? "-" : ""}${grouped}${dec ? "," + dec : ""}`;
}

type ColMeta = { numeric: boolean; money: boolean; percent: boolean; count: boolean; sum: number };

function analyseColumns(columns: string[], rows: (string | number | null | undefined)[][]): ColMeta[] {
  return columns.map((header, i) => {
    const values = rows.map((r) => r[i]);
    const filled = values.filter((v) => v != null && v !== "");
    const numeric = filled.length > 0 && filled.every(isNumericValue);
    const percent = PERCENT_RE.test(header);
    const money = numeric && !percent && MONEY_RE.test(header);
    const count = numeric && !percent && !money && COUNT_RE.test(header);
    const sum = numeric ? values.reduce((s, v) => s + toNumber(v), 0) : 0;
    return { numeric, money, percent, count, sum };
  });
}

function formatCell(v: string | number | null | undefined, m: ColMeta): string {
  if (v == null || v === "") return "—";
  if (m.money) return fmtNum(toNumber(v));
  if (m.percent && isNumericValue(v)) return `${fmtNum(toNumber(v), 1)} %`;
  if (m.numeric) {
    const n = toNumber(v);
    return Number.isInteger(n) ? fmtNum(n) : fmtNum(n, 2);
  }
  return String(v);
}

/** Ligne de totaux : uniquement montants et effectifs. */
function buildFootRow(columns: string[], metas: ColMeta[], rows: unknown[][]): string[] | null {
  const hasTotal = metas.some((m) => m.money || m.count);
  if (!hasTotal || rows.length < 2) return null;
  const foot = columns.map((_, i) => {
    const m = metas[i];
    if (m.money) return fmtNum(m.sum);
    if (m.count) return fmtNum(m.sum);
    return "";
  });
  const firstEmpty = foot.findIndex((c) => c === "");
  if (firstEmpty >= 0) foot[firstEmpty] = `TOTAL (${rows.length})`;
  return foot;
}

export async function exportRowsPDF(p: ExportPayload) {
  const orientation = p.orientation ?? (p.columns.length > 6 ? "landscape" : "portrait");
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 12; // marge latérale
  const logo = await loadLogo(p.ecole?.logo_url);

  // ---------- En-tête institutionnel ----------
  // Bandeau bordeaux fin en haut de page
  doc.setFillColor(...BORDEAUX);
  doc.rect(0, 0, pageW, 3, "F");
  doc.setFillColor(...JAUNE);
  doc.rect(0, 3, pageW, 1, "F");

  let headerTextX = M;
  if (logo) {
    const h = 15;
    const w = Math.min((logo.w / (logo.h || 1)) * h, 28);
    try { doc.addImage(logo.dataUrl, "PNG", M, 8, w, h); } catch { /* ignore */ }
    headerTextX = M + w + 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BORDEAUX);
  const nomEcole = (p.ecole?.nom ?? "").toUpperCase();
  const maxNomW = pageW - headerTextX - M - 60;
  if (nomEcole) {
    const nomLines = doc.splitTextToSize(nomEcole, Math.max(maxNomW, 60));
    doc.text(nomLines.slice(0, 2), headerTextX, 13);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  const infos: string[] = [];
  if (p.ecole?.adresse) infos.push(p.ecole.adresse);
  const contact = [p.ecole?.telephone, p.ecole?.email].filter(Boolean).join("  ·  ");
  if (contact) infos.push(contact);
  infos.forEach((l, i) => doc.text(doc.splitTextToSize(l, pageW - headerTextX - M)[0], headerTextX, 18 + i * 4));

  // Date à droite
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Édité le ${new Date().toLocaleString("fr-FR")}`, pageW - M, 13, { align: "right" });

  // ---------- Titre du rapport ----------
  let cursorY = 30;
  doc.setFillColor(...BORDEAUX);
  doc.rect(M, cursorY - 5, 2.5, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(25, 25, 25);
  const titleLines: string[] = doc.splitTextToSize(p.title, pageW - 2 * M - 8);
  doc.text(titleLines, M + 6, cursorY);
  cursorY += (titleLines.length - 1) * 6;

  if (p.sousTitre) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const sLines: string[] = doc.splitTextToSize(p.sousTitre, pageW - 2 * M - 8);
    doc.text(sLines, M + 6, cursorY + 5);
    cursorY += 5 + (sLines.length - 1) * 4;
  }
  doc.setTextColor(0, 0, 0);
  cursorY += 5;

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    const current = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.setDrawColor(220, 214, 216);
    doc.setLineWidth(0.2);
    doc.line(M, pageH - 11, pageW - M, pageH - 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    const left = [p.ecole?.sigle || p.ecole?.nom, p.ecole?.devise].filter(Boolean).join("  ·  ");
    if (left) doc.text(doc.splitTextToSize(left, pageW / 2)[0], M, pageH - 6);
    doc.text(`Page ${current} / ${pageCount}`, pageW - M, pageH - 6, { align: "right" });
    doc.setTextColor(0, 0, 0);
  };

  const baseFont = p.columns.length > 9 ? 7.5 : p.columns.length > 6 ? 8 : 9;

  const buildColumnStyles = (cols: string[], metas: ColMeta[]) => {
    const styles: Record<number, any> = {};
    cols.forEach((_, i) => {
      const m = metas[i];
      if (m.money) styles[i] = { halign: "right", fontStyle: "bold", cellWidth: "auto" };
      else if (m.numeric) styles[i] = { halign: "right", cellWidth: "auto" };
      else styles[i] = { halign: "left", cellWidth: "auto" };
    });
    styles[0] = { ...(styles[0] ?? {}), halign: styles[0]?.halign ?? "left", cellWidth: "auto" };
    return styles;
  };

  const commonTableOptions = (cols: string[], metas: ColMeta[]) => ({
    styles: {
      font: "helvetica",
      fontSize: baseFont,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
      overflow: "linebreak" as const,
      valign: "middle" as const,
      lineColor: [228, 222, 224] as [number, number, number],
      lineWidth: 0.1,
      textColor: [40, 40, 40] as [number, number, number],
    },
    headStyles: {
      fillColor: BORDEAUX,
      textColor: 255,
      fontStyle: "bold" as const,
      fontSize: baseFont,
      halign: "left" as const,
      cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
    },
    footStyles: {
      fillColor: [40, 24, 28] as [number, number, number],
      textColor: JAUNE,
      fontStyle: "bold" as const,
      fontSize: baseFont + 0.5,
    },
    alternateRowStyles: { fillColor: GRIS_LIGNE },
    theme: "grid" as const,
    margin: { left: M, right: M, bottom: 16 },
    columnStyles: buildColumnStyles(cols, metas),
    didDrawPage: drawFooter,
  });

  const group = p.pdfGroupBy;
  if (group && p.rows.length > 0) {
    const gi = group.columnIndex;
    const hideCol = group.hideColumn !== false;
    const pageBreak = group.pageBreak !== false;
    const label = group.label ?? p.columns[gi] ?? "Groupe";
    const displayCols = hideCol ? p.columns.filter((_, i) => i !== gi) : p.columns;

    const groupsMap = new Map<string, (string | number | null | undefined)[][]>();
    for (const r of p.rows) {
      const key = r[gi] == null || r[gi] === "" ? "— Non renseigné —" : String(r[gi]);
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(hideCol ? r.filter((_, i) => i !== gi) : r);
    }

    let first = true;
    for (const [key, rows] of groupsMap) {
      if (!first && pageBreak) { doc.addPage(); cursorY = 20; }
      first = false;
      if (cursorY > pageH - 50) { doc.addPage(); cursorY = 20; }

      // Bandeau de groupe
      doc.setFillColor(245, 238, 240);
      doc.rect(M, cursorY, pageW - 2 * M, 9, "F");
      doc.setFillColor(...BORDEAUX);
      doc.rect(M, cursorY, 2.5, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...BORDEAUX);
      doc.text(`${label} : ${key}`, M + 6, cursorY + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(`${rows.length} élément(s)`, pageW - M - 3, cursorY + 6, { align: "right" });
      doc.setTextColor(0, 0, 0);

      const metas = analyseColumns(displayCols, rows);
      const foot = buildFootRow(displayCols, metas, rows);
      autoTable(doc, {
        head: [displayCols],
        body: rows.map((r) => r.map((v, i) => formatCell(v, metas[i]))),
        foot: foot ? [foot] : undefined,
        startY: cursorY + 11,
        ...commonTableOptions(displayCols, metas),
      });
      cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY + 20) + 6;
    }

    // Total général toutes classes confondues
    const allMetas = analyseColumns(displayCols, p.rows.map((r) => (hideCol ? r.filter((_, i) => i !== gi) : r)));
    const totalRow = buildFootRow(
      displayCols,
      allMetas,
      p.rows,
    );
    if (totalRow) {
      if (cursorY > pageH - 40) { doc.addPage(); cursorY = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BORDEAUX);
      doc.text("TOTAL GÉNÉRAL", M, cursorY + 5);
      doc.setTextColor(0, 0, 0);
      autoTable(doc, {
        head: [displayCols],
        body: [totalRow.map((c, i) => (i === 0 && !c ? "Toutes classes" : c))],
        startY: cursorY + 8,
        ...commonTableOptions(displayCols, allMetas),
        headStyles: {
          ...commonTableOptions(displayCols, allMetas).headStyles,
          fillColor: [40, 24, 28] as [number, number, number],
        },
        bodyStyles: {
          fillColor: [245, 238, 240] as [number, number, number],
          fontStyle: "bold" as const,
          textColor: BORDEAUX,
          fontSize: baseFont + 0.5,
        },
        alternateRowStyles: {},
      });
      cursorY = (doc as any).lastAutoTable?.finalY ?? cursorY + 20;
    }
  } else {
    const metas = analyseColumns(p.columns, p.rows);
    const foot = buildFootRow(p.columns, metas, p.rows);
    autoTable(doc, {
      head: [p.columns],
      body: p.rows.length
        ? p.rows.map((r) => r.map((v, i) => formatCell(v, metas[i])))
        : [[{ content: "Aucune donnée pour ces critères.", colSpan: p.columns.length, styles: { halign: "center", textColor: [130, 130, 130] } } as any]],
      foot: foot ? [foot] : undefined,
      startY: cursorY,
      ...commonTableOptions(p.columns, metas),
    });
  }

  // ---------- Résumé & Total mis en valeur ----------
  if (p.pdfSummary && (p.pdfSummary.modes?.length || p.pdfSummary.grandTotal != null)) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? cursorY + 10;
    let y = finalY + 10;

    if (p.pdfSummary.modes && p.pdfSummary.modes.length > 0) {
      if (y > pageH - 70) { doc.addPage(); y = 22; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...BORDEAUX);
      doc.text("Répartition par mode de paiement", M, y);
      doc.setTextColor(0, 0, 0);
      y += 3;
      const modeTotal = p.pdfSummary.modes.reduce((s, m) => s + (Number(m.total) || 0), 0);
      const modeCount = p.pdfSummary.modes.reduce((s, m) => s + (Number(m.count) || 0), 0);
      autoTable(doc, {
        startY: y,
        head: [["Mode de paiement", "Nb", "Montant (FCFA)"]],
        body: p.pdfSummary.modes.map((m) => [m.label, fmtNum(m.count), fmtNum(m.total)]),
        foot: [["TOTAL", fmtNum(modeCount), fmtNum(modeTotal)]],
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 2.6,
          overflow: "linebreak",
          lineColor: [228, 222, 224],
          lineWidth: 0.1,
        },
        headStyles: { fillColor: BORDEAUX, textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [40, 24, 28], textColor: JAUNE, fontStyle: "bold", fontSize: 9.5 },
        alternateRowStyles: { fillColor: GRIS_LIGNE },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { halign: "right", cellWidth: 22 },
          2: { halign: "right", cellWidth: 48, fontStyle: "bold" },
        },
        theme: "grid",
        margin: { left: M, right: M, bottom: 16 },
        didDrawPage: drawFooter,
      });
      y = (doc as any).lastAutoTable?.finalY ?? y + 20;
    }

    // Total général mis en valeur — encadré Bordeaux / Jaune
    if (p.pdfSummary.grandTotal != null) {
      y += 8;
      const boxH = 22;
      if (y > pageH - (boxH + 18)) { doc.addPage(); y = 22; }
      const boxX = M;
      const boxW = pageW - 2 * M;
      doc.setFillColor(...BORDEAUX);
      doc.rect(boxX, y, boxW, boxH, "F");
      doc.setFillColor(...JAUNE);
      doc.rect(boxX, y, 5, boxH, "F");

      const label = (p.pdfSummary.grandTotalLabel ?? "TOTAL ENCAISSÉ").toUpperCase();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(label, boxX + 11, y + (p.pdfSummary.operationsCount != null ? 9.5 : boxH / 2 + 1.5));
      if (p.pdfSummary.operationsCount != null) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...JAUNE);
        doc.text(`${fmtNum(p.pdfSummary.operationsCount)} opération(s)`, boxX + 11, y + 16);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.setTextColor(...JAUNE);
      doc.text(fmtFCFA(p.pdfSummary.grandTotal), boxX + boxW - 8, y + boxH / 2 + 2, {
        align: "right",
        baseline: "middle",
      });
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
    }
  }

  doc.save(`${p.filename}.pdf`);
}

// Formatage FCFA compatible jsPDF Helvetica (pas de U+202F)
export function fmtFCFA(n: number | null | undefined): string {
  const v = Math.round(Number(n) || 0);
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${v < 0 ? "-" : ""}${s} FCFA`;
}

