import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileBarChart, Plus, Calendar } from "lucide-react";

const sessions = [
  { nom: "Composition T2 — 2024/2025", periode: "Avril – Mai 2025", classes: 24, matieres: 12, statut: "En cours" },
  { nom: "Composition T1 — 2024/2025", periode: "Décembre 2024", classes: 24, matieres: 12, statut: "Clôturée" },
  { nom: "Examen blanc BAC", periode: "Mars 2025", classes: 6, matieres: 8, statut: "Clôturée" },
  { nom: "Examen blanc BEPC", periode: "Mars 2025", classes: 8, matieres: 7, statut: "Clôturée" },
];

const tone: Record<string, string> = {
  "En cours": "bg-orange-500/15 text-orange-600",
  "Clôturée": "bg-accent/15 text-primary",
};

export default function Compositions() {
  return (
    <SettingsSection
      icon={<FileBarChart className='h-5 w-5' />}
      title="Compositions & examens"
      description="Sessions de compositions trimestrielles et examens blancs."
      >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessions.map((s, i) => (
          <Card key={i} className="border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold font-display text-primary">{s.nom}</h4>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> {s.periode}
                  </p>
                </div>
                <Badge className={tone[s.statut]} variant="secondary">{s.statut}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Classes</p>
                  <p className="text-lg font-bold text-primary">{s.classes}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Matières</p>
                  <p className="text-lg font-bold text-primary">{s.matieres}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
