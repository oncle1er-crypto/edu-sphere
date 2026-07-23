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

export interface ExportPayload {
  title: string;
  filename: string; // sans extension
  columns: string[];
  rows: (string | number | null | undefined)[][];
  sousTitre?: string;
  ecole?: EcoleHeaderInfo | null;
  orientation?: "portrait" | "landscape";
  pdfSummary?: PdfSummary;
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

export async function exportRowsPDF(p: ExportPayload) {
  const orientation = p.orientation ?? (p.columns.length > 6 ? "landscape" : "portrait");
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const logo = await loadLogo(p.ecole?.logo_url);
  let cursorY = 12;

  if (logo) {
    const h = 14;
    const w = (logo.w / (logo.h || 1)) * h;
    try { doc.addImage(logo.dataUrl, "PNG", 14, 8, w, h); } catch { /* ignore */ }
  }
  if (p.ecole?.nom) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(p.ecole.nom.toUpperCase(), pageW - 14, 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines: string[] = [];
    if (p.ecole.sigle) lines.push(p.ecole.sigle);
    if (p.ecole.adresse) lines.push(p.ecole.adresse);
    const tel = [p.ecole.telephone, p.ecole.email].filter(Boolean).join(" · ");
    if (tel) lines.push(tel);
    lines.forEach((l, i) => doc.text(l, pageW - 14, 17 + i * 4, { align: "right" }));
  }
  cursorY = 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(p.title, 14, cursorY);
  cursorY += 5;
  if (p.sousTitre) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(p.sousTitre, 14, cursorY);
    doc.setTextColor(0, 0, 0);
    cursorY += 5;
  }
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Généré le ${new Date().toLocaleString("fr-FR")}`, 14, cursorY);
  doc.setTextColor(0, 0, 0);
  cursorY += 3;

  autoTable(doc, {
    head: [p.columns],
    body: p.rows.map((r) => r.map((v) => (v == null ? "" : String(v)))),
    startY: cursorY + 2,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [110, 26, 44], textColor: 255 },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      const current = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Page ${current} / ${pageCount}`,
        pageW - 14,
        doc.internal.pageSize.getHeight() - 6,
        { align: "right" },
      );
      doc.setTextColor(0, 0, 0);
    },
  });

  doc.save(`${p.filename}.pdf`);
}

// Formatage FCFA compatible jsPDF Helvetica (pas de U+202F)
export function fmtFCFA(n: number | null | undefined): string {
  const v = Math.round(Number(n) || 0);
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${v < 0 ? "-" : ""}${s} FCFA`;
}
