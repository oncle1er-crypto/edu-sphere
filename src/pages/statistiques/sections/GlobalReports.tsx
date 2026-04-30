import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, FileSpreadsheet, FileBarChart } from "lucide-react";
import { toast } from "sonner";

const reports = [
  { title: "Rapport mensuel consolidé", desc: "Synthèse PDF de tous les modules sur le réseau.", icon: FileBarChart, format: "PDF" },
  { title: "Export Excel — KPIs réseau", desc: "Tableau croisé par école et par module.", icon: FileSpreadsheet, format: "XLSX" },
  { title: "Rapport académique annuel", desc: "Bulletins, moyennes et taux de réussite.", icon: FileText, format: "PDF" },
  { title: "Rapport financier consolidé", desc: "Revenus, impayés, trésorerie multi-écoles.", icon: FileSpreadsheet, format: "XLSX" },
  { title: "Rapport des présences", desc: "Assiduité par classe et par établissement.", icon: FileText, format: "PDF" },
  { title: "Rapport opérationnel", desc: "Cantine, transport, bibliothèque agrégés.", icon: FileBarChart, format: "PDF" },
];

export default function GlobalReports() {
  return (
    <SettingsSection
      title="Rapports & exports"
      description="Génération de rapports consolidés pour la direction du réseau."
      icon={<FileText className="h-5 w-5" />}
      hideSave
    >
      <div className="grid md:grid-cols-2 gap-3">
        {reports.map((r) => (
          <Card key={r.title} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm truncate">{r.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                  <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-primary">{r.format}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.success(`Génération : ${r.title}`)}
              >
                <Download className="h-4 w-4 mr-1" /> Générer
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
