import { messageErreurBase } from "@/lib/dbErrorMessages";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, FileSpreadsheet, FileBarChart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useEcoleId } from "@/hooks/useEcoleId";
import {
  generateRapportMensuelConsolide,
  generateKpisReseauXlsx,
  generateRapportAcademique,
  generateRapportFinancierXlsx,
  generateRapportPresences,
  generateRapportOperationnel,
} from "@/lib/statsReports";

const reports: {
  key: string;
  title: string;
  desc: string;
  icon: typeof FileBarChart;
  format: "PDF" | "XLSX";
  run: (ecoleId: string) => Promise<void>;
}[] = [
  { key: "mensuel", title: "Rapport mensuel consolidé", desc: "Synthèse PDF des KPIs du mois en cours.", icon: FileBarChart, format: "PDF", run: generateRapportMensuelConsolide },
  { key: "xlsx-kpis", title: "Export Excel — KPIs réseau", desc: "Tableau croisé (élèves, enseignants, finances, présences).", icon: FileSpreadsheet, format: "XLSX", run: generateKpisReseauXlsx },
  { key: "academique", title: "Rapport académique annuel", desc: "Moyennes et taux de réussite par classe et matière.", icon: FileText, format: "PDF", run: generateRapportAcademique },
  { key: "financier", title: "Rapport financier consolidé", desc: "Tranches attendues, encaissées et restant dû par élève.", icon: FileSpreadsheet, format: "XLSX", run: generateRapportFinancierXlsx },
  { key: "presences", title: "Rapport des présences", desc: "Assiduité par classe sur les 30 derniers jours.", icon: FileText, format: "PDF", run: generateRapportPresences },
  { key: "operationnel", title: "Rapport opérationnel", desc: "Cantine, transport, bibliothèque agrégés (30 j).", icon: FileBarChart, format: "PDF", run: generateRapportOperationnel },
];

export default function GlobalReports() {
  const { ecoleId } = useEcoleId();
  const [running, setRunning] = useState<string | null>(null);

  const handle = async (r: typeof reports[number]) => {
    if (!ecoleId) { toast.error("École introuvable"); return; }
    setRunning(r.key);
    try {
      await r.run(ecoleId);
      toast.success(`${r.title} généré`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur : ${messageErreurBase(err) ?? "génération impossible"}`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <SettingsSection
      title="Rapports & exports"
      description="Génération de rapports consolidés pour la direction du réseau."
      icon={<FileText className="h-5 w-5" />}
      hideSave
    >
      <div className="grid md:grid-cols-2 gap-3">
        {reports.map((r) => (
          <Card key={r.key} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-accent/15 text-primary flex items-center justify-center shrink-0">
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
                disabled={running === r.key}
                onClick={() => handle(r)}
              >
                {running === r.key
                  ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  : <Download className="h-4 w-4 mr-1" />}
                Générer
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
