import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Wrench, BookCheck, ShieldCheck } from "lucide-react";

const equipes = [
  { nom: "Direction", icon: ShieldCheck, count: 3, membres: ["Diakité Salif (Directeur)", "Bamba Aliou (Directeur adjoint)", "Konaté Awa (Censeur)"] },
  { nom: "Comptabilité", icon: BookCheck, count: 2, membres: ["Cissé Kadiatou", "Sangaré Issa"] },
  { nom: "Surveillance", icon: Users, count: 5, membres: ["Konaté Boubacar", "Diallo Mariam", "Bah Souleymane", "Touré Fatim", "Coulibaly Ibrahim"] },
  { nom: "Maintenance & Entretien", icon: Wrench, count: 8, membres: ["Équipe entretien (6)", "Technicien informatique (1)", "Jardinier (1)"] },
];

export default function StaffAdmin() {
  return (
    <SettingsSection
      icon={<Briefcase className="h-5 w-5" />}
      title="Personnel administratif & support"
      description="Équipes hors enseignement : direction, comptabilité, surveillance, entretien."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {equipes.map((e) => (
          <Card key={e.nom} className="border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/15 text-primary flex items-center justify-center">
                    <e.icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold font-display">{e.nom}</h4>
                </div>
                <Badge>{e.count} membres</Badge>
              </div>
              <ul className="space-y-1 pt-2 border-t">
                {e.membres.map((m) => (
                  <li key={m} className="text-sm text-muted-foreground">• {m}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
