import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, FileDown } from "lucide-react";

const reports = [
  { title: "Registre mensuel des absences", desc: "Détail jour par jour pour toute l'école", format: "PDF" },
  { title: "Rapport par classe", desc: "Synthèse par classe sur la période choisie", format: "Excel" },
  { title: "Liste des élèves à risque", desc: "Élèves dépassant 5 absences non justifiées", format: "PDF" },
  { title: "Rapport ministériel", desc: "Format réglementaire pour l'inspection académique", format: "PDF" },
  { title: "Pointage personnel", desc: "Heures de présence des enseignants sur la période", format: "Excel" },
];

export default function AttendanceReports() {
  return (
    <SettingsSection
      icon={<ShieldCheck className="h-5 w-5" />}
      title="Rapports & exports"
      description="Génération de documents officiels pour l'administration."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Card key={r.title} className="border">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                <p className="text-[10px] uppercase tracking-widest text-accent font-bold mt-2">{r.format}</p>
              </div>
              <Button size="sm" variant="outline"><FileDown className="h-4 w-4" /> Exporter</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
