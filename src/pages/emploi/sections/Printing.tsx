import { SettingsSection } from "@/components/settings/SettingsSection";
import { Printer, FileText, FileSpreadsheet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const exports = [
  { title: "EDT par classe (PDF)", desc: "Un PDF par classe avec mise en page A4.", icon: FileText },
  { title: "EDT par enseignant (PDF)", desc: "Planning individuel par professeur.", icon: FileText },
  { title: "Occupation des salles (Excel)", desc: "Feuille de calcul par salle.", icon: FileSpreadsheet },
  { title: "Synthèse hebdomadaire (PDF)", desc: "Vue globale de l'établissement.", icon: FileText },
];

export default function Printing() {
  return (
    <SettingsSection
      title="Impression & exports"
      description="Générez et téléchargez les emplois du temps."
      icon={<Printer className="h-5 w-5" />}
      hideSave
    >
      <div className="grid md:grid-cols-2 gap-4">
        {exports.map((e) => (
          <Card key={e.title} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 text-primary flex items-center justify-center shrink-0">
                <e.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{e.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
                <Button size="sm" variant="outline" className="mt-3 gap-2">
                  <Download className="h-3.5 w-3.5" /> Télécharger
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
