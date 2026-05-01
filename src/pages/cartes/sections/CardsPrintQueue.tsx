import { useState } from "react";
import { useCards } from "@/pages/cartes/context/CardsContext";
import { SchoolCard } from "@/pages/cartes/components/SchoolCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, FileDown, Layers } from "lucide-react";

export default function CardsPrintQueue() {
  const { cards } = useCards();
  const printable = cards.filter((c) => c.statut === "active");
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(printable.map((c) => [c.id, true]))
  );

  const toPrint = printable.filter((c) => selected[c.id]);
  const sheets = Math.ceil(toPrint.length / 10);

  return (
    <div className="space-y-6">
      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold font-display text-primary flex items-center gap-2">
                <Printer className="h-5 w-5" /> File d'impression
              </h2>
              <p className="text-sm text-muted-foreground">
                {toPrint.length} carte(s) sélectionnée(s) — {sheets} planche(s) A4
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                <FileDown className="h-4 w-4" />Exporter PDF
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" />Imprimer
              </Button>
            </div>
          </div>

          <div className="border rounded-lg divide-y print:hidden max-h-72 overflow-y-auto">
            {printable.map((c) => (
              <label key={c.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40">
                <Checkbox
                  checked={!!selected[c.id]}
                  onCheckedChange={(v) => setSelected((s) => ({ ...s, [c.id]: v === true }))}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.nom} {c.prenom}</p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="mr-1 text-[10px]">{c.type}</Badge>
                    {c.matricule}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Zone d'impression — planches A4 (210 × 297 mm) */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 print:hidden">
          <Layers className="h-4 w-4" />
          Aperçu des planches A4
        </h3>

        <div id="print-area" className="space-y-6 print:space-y-0">
          {Array.from({ length: sheets }).map((_, sheetIdx) => {
            const slice = toPrint.slice(sheetIdx * 10, sheetIdx * 10 + 10);
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
                    gridTemplateColumns: "repeat(2, 85.6mm)",
                    gridAutoRows: "54mm",
                    gap: "5mm",
                    justifyContent: "center",
                  }}
                >
                  {slice.map((c) => (
                    <div
                      key={c.id}
                      style={{ width: "85.6mm", height: "54mm" }}
                      className="border border-dashed border-slate-300"
                    >
                      <SchoolCard data={c} scale={3.78 * 1} className="!shadow-none !border-0" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}
