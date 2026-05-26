import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Eye, Loader2 } from "lucide-react";
import {
  StudentIdCard,
  StudentIdCardFront,
  StudentIdCardBack,
  type StudentCardData,
  CARD_W_MM,
  CARD_H_MM,
} from "./StudentIdCard";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  data: StudentCardData;
}

/**
 * Modal d'aperçu + actions sur la carte scolaire.
 */
export function StudentCardPreview({ open, onClose, data }: Props) {
  const rectoRef = useRef<HTMLDivElement>(null);
  const versoRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setBusy(true);
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      if (!rectoRef.current || !versoRef.current) {
        toast.error("Impossible de capturer la carte");
        return;
      }

      const opts = { scale: 4, backgroundColor: null, useCORS: true, logging: false };
      const rectoCanvas = await html2canvas(rectoRef.current, opts);
      const versoCanvas = await html2canvas(versoRef.current, opts);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [CARD_W_MM, CARD_H_MM],
      });

      pdf.addImage(
        rectoCanvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        CARD_W_MM,
        CARD_H_MM,
        undefined,
        "FAST",
      );
      pdf.addPage([CARD_W_MM, CARD_H_MM], "portrait");
      pdf.addImage(
        versoCanvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        CARD_W_MM,
        CARD_H_MM,
        undefined,
        "FAST",
      );

      const filename = `carte-scolaire-${(data.matricule || data.id)
        .replace(/[^a-z0-9-]/gi, "_")
        .toLowerCase()}.pdf`;
      pdf.save(filename);
      toast.success("Carte téléchargée");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Aperçu de la carte scolaire
          </DialogTitle>
          <DialogDescription>
            Format CR80 portrait — {CARD_W_MM} × {CARD_H_MM} mm — recto / verso prêts pour impression PVC.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-6 items-start justify-center py-4 print:hidden">
          <div className="flex flex-col items-center gap-2">
            <div ref={rectoRef}>
              <StudentIdCardFront data={data} scale={1.6} />
            </div>
            <span className="text-xs font-semibold text-muted-foreground tracking-wider">RECTO</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div ref={versoRef}>
              <StudentIdCardBack data={data} scale={1.6} />
            </div>
            <span className="text-xs font-semibold text-muted-foreground tracking-wider">VERSO</span>
          </div>
        </div>

        {/* Zone d'impression dédiée (taille réelle) */}
        <div id="student-card-print-area" className="hidden print:block">
          <div className="page">
            <StudentIdCardFront data={data} scale={3.78} />
          </div>
          <div className="page" style={{ pageBreakBefore: "always" }}>
            <StudentIdCardBack data={data} scale={3.78} />
          </div>
        </div>

        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={handlePrint} disabled={busy}>
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
          <Button onClick={handleDownloadPDF} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Télécharger PDF
          </Button>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #student-card-print-area, #student-card-print-area * { visibility: visible !important; }
            #student-card-print-area { position: absolute; left: 0; top: 0; }
            #student-card-print-area .page {
              width: ${CARD_W_MM}mm;
              height: ${CARD_H_MM}mm;
              overflow: hidden;
            }
            @page { size: ${CARD_W_MM}mm ${CARD_H_MM}mm; margin: 0; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
