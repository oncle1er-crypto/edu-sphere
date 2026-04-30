import { SettingsSection } from "@/components/settings/SettingsSection";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const exports = [
  { title: "Catalogue complet (Excel)", desc: "Tous les ouvrages référencés." },
  { title: "Emprunts en cours (PDF)", desc: "Liste des sorties non rendues." },
  { title: "Retards (PDF)", desc: "Lecteurs en retard et pénalités." },
  { title: "Top emprunts (PDF)", desc: "Classement annuel des ouvrages." },
  { title: "Inventaire physique (Excel)", desc: "Fiche pour l'inventaire annuel." },
  { title: "Acquisitions (Excel)", desc: "Achats et dons par période." },
];

export default function LibraryReports() {
  return (
    <SettingsSection
      title="Rapports & exports"
      description="Documents disponibles au téléchargement."
      icon={<FileText className="h-5 w-5" />}
      hideSave
    >
      <div className="grid md:grid-cols-2 gap-4">
        {exports.map((e) => (
          <Card key={e.title} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
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
