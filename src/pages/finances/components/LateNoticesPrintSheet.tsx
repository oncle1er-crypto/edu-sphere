import type { EcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import { LateNoticeCard } from "./LateNoticeCard";

export interface PrintableNotice {
  eleveId: string;
  nomEleve: string;
  classe: string;
  texte: string;
}

interface Props {
  ecole: EcoleInfo | null;
  notices: PrintableNotice[];
  /** Avis par page A4 (2 colonnes fixes) — 6 par défaut (dans la fourchette 4–8 demandée). */
  parPage?: 4 | 6 | 8;
}

const GRID_ROWS: Record<number, number> = { 4: 2, 6: 3, 8: 4 };

/**
 * Grille d'impression A4 — reprend exactement le pattern déjà éprouvé dans
 * `src/pages/cartes/sections/CardsPrintQueue.tsx` (planche 210×297mm,
 * `print:break-after-page` entre planches, bordure pointillée de découpe,
 * `#print-area` + `@media print` masquant tout le reste de l'UI). On ne
 * réinvente pas de mécanisme d'impression parallèle.
 */
export function LateNoticesPrintSheet({ ecole, notices, parPage = 6 }: Props) {
  const rows = GRID_ROWS[parPage] ?? 3;
  const sheets = Math.ceil(notices.length / parPage) || 0;

  return (
    <>
      <div id="print-area" className="space-y-6 print:space-y-0">
        {Array.from({ length: sheets }).map((_, sheetIdx) => {
          const slice = notices.slice(sheetIdx * parPage, sheetIdx * parPage + parPage);
          return (
            <div
              key={sheetIdx}
              className="bg-white mx-auto shadow-md print:shadow-none print:break-after-page"
              style={{ width: "210mm", minHeight: "297mm", padding: "10mm" }}
            >
              <p className="text-[10px] text-slate-400 mb-2 print:hidden">
                Planche {sheetIdx + 1} / {sheets}
              </p>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(2, 92mm)",
                  gridTemplateRows: `repeat(${rows}, 88mm)`,
                  gap: "5mm",
                  justifyContent: "center",
                }}
              >
                {slice.map((n) => (
                  <div key={n.eleveId} className="border border-dashed border-slate-300">
                    <LateNoticeCard ecole={ecole} nomEleve={n.nomEleve} classe={n.classe} texte={n.texte} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </>
  );
}
