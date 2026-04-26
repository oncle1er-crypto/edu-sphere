import { BarChart3, Download, FileText } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const reports = [
  { title: "Compte de résultat", description: "Recettes vs charges sur la période", period: "Avril 2026" },
  { title: "Bilan comptable", description: "Actif et passif de l'établissement", period: "31/03/2026" },
  { title: "Flux de trésorerie", description: "Entrées et sorties détaillées", period: "Avril 2026" },
  { title: "Recouvrement scolarité", description: "Taux de paiement par classe", period: "Trimestre 2" },
  { title: "Analyse des impayés", description: "Vieillissement de la créance", period: "À ce jour" },
  { title: "Rapport TVA", description: "Déclaration mensuelle", period: "Mars 2026" },
  { title: "Masse salariale", description: "Évolution annuelle", period: "Année 2025-2026" },
  { title: "Rentabilité par filière", description: "Marge nette par cycle", period: "Année en cours" },
];

export default function Reports() {
  return (
    <SettingsSection
      title="Rapports financiers"
      description="Exports comptables et tableaux de bord exécutifs."
      icon={<BarChart3 className="h-5 w-5" />}
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Card key={r.title} className="border hover:shadow-[var(--shadow-card)] transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold font-display text-primary">{r.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Période : {r.period}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" className="flex-1">Visualiser</Button>
                <Button size="sm" className="flex-1"><Download className="h-4 w-4" />PDF</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
