import { messageErreurBase } from "@/lib/dbErrorMessages";
import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Printer, FileText, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { toast } from "sonner";
import {
  exportEDTParClassePDF,
  exportEDTParEnseignantPDF,
  exportOccupationSallesXLSX,
  exportSyntheseHebdoPDF,
} from "@/lib/generateEmploiDuTempsExports";

export default function Printing() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (!ecoleId || !anneeId) {
      toast.error("École ou année scolaire non sélectionnée");
      return;
    }
    setBusy(key);
    try {
      await fn();
      toast.success("Export généré");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur export : " + (messageErreurBase(e) ?? "inconnue"));
    } finally {
      setBusy(null);
    }
  };

  const items = [
    {
      key: "classes",
      title: "EDT par classe (PDF)",
      desc: "Un PDF avec une page par classe en mise en page A4 paysage.",
      icon: FileText,
      action: () => exportEDTParClassePDF(ecoleId!, anneeId!),
    },
    {
      key: "enseignants",
      title: "EDT par enseignant (PDF)",
      desc: "Planning individuel par professeur, une page chacun.",
      icon: FileText,
      action: () => exportEDTParEnseignantPDF(ecoleId!, anneeId!),
    },
    {
      key: "salles",
      title: "Occupation des salles (Excel)",
      desc: "Récapitulatif + une feuille par salle (jours, horaires, classes).",
      icon: FileSpreadsheet,
      action: () => exportOccupationSallesXLSX(ecoleId!, anneeId!),
    },
    {
      key: "synthese",
      title: "Synthèse hebdomadaire (PDF)",
      desc: "Liste complète de tous les créneaux de l'établissement.",
      icon: FileText,
      action: () => exportSyntheseHebdoPDF(ecoleId!, anneeId!),
    },
  ];

  return (
    <SettingsSection
      title="Impression & exports"
      description="Générez et téléchargez les emplois du temps."
      icon={<Printer className="h-5 w-5" />}
      hideSave
    >
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((e) => {
          const Icon = e.icon;
          const isBusy = busy === e.key;
          return (
            <Card key={e.key} className="border shadow-[var(--shadow-card)]">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/15 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{e.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 gap-2"
                    disabled={isBusy || !ecoleId || !anneeId}
                    onClick={() => run(e.key, e.action)}
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {isBusy ? "Génération…" : "Télécharger"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </SettingsSection>
  );
}
