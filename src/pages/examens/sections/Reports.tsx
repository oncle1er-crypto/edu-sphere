import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download } from "lucide-react";

const reports = [
  { titre: "Procès-verbal de délibération", desc: "PV complet par classe et trimestre", format: "PDF" },
  { titre: "Relevés de notes individuels", desc: "Détail des notes par élève", format: "PDF" },
  { titre: "Statistiques par matière", desc: "Moyennes et écarts-types", format: "Excel" },
  { titre: "Palmarès trimestriel", desc: "Classement officiel des élèves", format: "PDF" },
  { titre: "Rapport d'évolution", desc: "Comparaison T1 vs T2 vs T3", format: "Excel" },
  { titre: "Liste des admis/redoublants", desc: "Décisions de fin d'année", format: "PDF" },
];

export default function Reports() {
  return (
    <SettingsSection icon={<FileSpreadsheet className='h-5 w-5' />} title="Rapports pédagogiques" description="Documents officiels prêts à imprimer ou exporter.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reports.map((r, i) => (
          <Card key={i} className="border">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{r.titre}</p>
                <p className="text-xs text-muted-foreground">{r.desc} · {r.format}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-2 shrink-0">
                <Download className="h-3.5 w-3.5" /> Générer
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
