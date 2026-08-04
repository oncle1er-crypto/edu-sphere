import { messageErreurBase } from "@/lib/dbErrorMessages";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, FileCode2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  exportRowsCSV,
  exportRowsXLSX,
  exportRowsPDF,
  type EcoleHeaderInfo,
  type PdfSummary,
  type PdfGroupBy,
} from "@/lib/reports/exporters";

export interface ReportExportButtonsProps {
  title: string;
  filename: string;
  columns: string[];
  /** Retourne les lignes (synchrone ou async). */
  getRows: () => (string | number | null | undefined)[][] | Promise<(string | number | null | undefined)[][]>;
  sousTitre?: string;
  ecole?: EcoleHeaderInfo | null;
  orientation?: "portrait" | "landscape";
  size?: "sm" | "default";
  /** Cache un ou plusieurs formats. */
  hide?: Array<"csv" | "xlsx" | "pdf">;
  disabled?: boolean;
  /** Résumé mis en valeur sous le tableau du PDF (répartition modes + total). */
  /** Résumé mis en valeur sous le tableau du PDF (répartition modes + total). */
  pdfSummary?: PdfSummary;
  /** Groupement PDF : une section (+ page) par valeur distincte d'une colonne. */
  pdfGroupBy?: PdfGroupBy;
}

export function ReportExportButtons({
  title,
  filename,
  columns,
  getRows,
  sousTitre,
  ecole,
  orientation,
  size = "sm",
  hide = [],
  disabled,
  pdfSummary,
  pdfGroupBy,
}: ReportExportButtonsProps) {
  const [busy, setBusy] = useState<null | "csv" | "xlsx" | "pdf">(null);

  const run = async (fmt: "csv" | "xlsx" | "pdf") => {
    if (disabled) return;
    setBusy(fmt);
    try {
      const rows = await getRows();
      if (!rows || rows.length === 0) {
        toast.warning("Aucune donnée à exporter");
        return;
      }
      const payload = { title, filename, columns, rows, sousTitre, ecole, orientation, pdfSummary, pdfGroupBy };
      if (fmt === "csv") exportRowsCSV(payload);
      else if (fmt === "xlsx") exportRowsXLSX(payload);
      else await exportRowsPDF(payload);
      toast.success(`Export ${fmt.toUpperCase()} téléchargé`);
    } catch (e: any) {
      console.error(e);
      toast.error(messageErreurBase(e) || "Erreur lors de l'export");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!hide.includes("csv") && (
        <Button size={size} variant="outline" disabled={disabled || busy !== null} onClick={() => run("csv")}>
          {busy === "csv" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileCode2 className="h-4 w-4 mr-1" />}
          CSV
        </Button>
      )}
      {!hide.includes("xlsx") && (
        <Button size={size} variant="outline" disabled={disabled || busy !== null} onClick={() => run("xlsx")}>
          {busy === "xlsx" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />}
          Excel
        </Button>
      )}
      {!hide.includes("pdf") && (
        <Button size={size} disabled={disabled || busy !== null} onClick={() => run("pdf")}>
          {busy === "pdf" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
          PDF
        </Button>
      )}
    </div>
  );
}
