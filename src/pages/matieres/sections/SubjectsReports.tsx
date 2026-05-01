import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download } from "lucide-react";

const REPORTS = [
  { titre: "Catalogue officiel des matières", desc: "Liste complète conforme MENA, exportable PDF.", format: "PDF" },
  { titre: "Volumes horaires par cycle", desc: "Tableau récapitulatif des heures hebdomadaires.", format: "XLSX" },
  { titre: "Affectations enseignants/matières", desc: "Qui enseigne quoi dans quelle classe.", format: "PDF" },
  { titre: "Avancement des programmes", desc: "Suivi pédagogique par trimestre.", format: "PDF" },
  { titre: "Coefficients par filière", desc: "Pondérations utilisées pour les bulletins.", format: "PDF" },
];

export default function SubjectsReports() {
  return (
    <SettingsSection
      icon={<FileBarChart className="h-5 w-5" />}
      title="Rapports"
      description="Documents officiels et exports relatifs aux matières."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <Card key={r.titre} className="border">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm">{r.titre}</h3>
                <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-muted">{r.format}</span>
              </div>
              <Button variant="outline" size="sm"><Download className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
