import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Monitor, FlaskConical, Dumbbell, BookOpen } from "lucide-react";

const salles = [
  { code: "M01", nom: "Salle Maternelle 1", capacite: 25, type: "Standard", icon: BookOpen, classe: "PS A", batiment: "A" },
  { code: "P01", nom: "Salle Primaire 1", capacite: 35, type: "Standard", icon: BookOpen, classe: "CP A", batiment: "A" },
  { code: "C12", nom: "Salle Collège 12", capacite: 40, type: "Standard", icon: BookOpen, classe: "6ème A", batiment: "B" },
  { code: "INFO-1", nom: "Salle informatique 1", capacite: 30, type: "Informatique", icon: Monitor, classe: "—", batiment: "C" },
  { code: "LAB-PHY", nom: "Laboratoire Physique", capacite: 24, type: "Laboratoire", icon: FlaskConical, classe: "—", batiment: "C" },
  { code: "LAB-SVT", nom: "Laboratoire SVT", capacite: 24, type: "Laboratoire", icon: FlaskConical, classe: "—", batiment: "C" },
  { code: "GYM", nom: "Gymnase", capacite: 80, type: "Sport", icon: Dumbbell, classe: "—", batiment: "D" },
  { code: "L20", nom: "Salle Lycée 20", capacite: 30, type: "Standard", icon: BookOpen, classe: "Tle S1", batiment: "B" },
];

export default function ClassesRooms() {
  return (
    <SettingsSection
      icon={<MapPin className="h-5 w-5" />}
      title="Salles de classe"
      description="Inventaire et affectation des salles."
    >
      <div className="flex justify-end">
        <Button size="sm"><Plus className="h-4 w-4" />Nouvelle salle</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {salles.map((s) => (
          <Card key={s.code} className="border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold font-display text-sm">{s.nom}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{s.code}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">Bât. {s.batiment}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                <Badge variant="secondary" className="text-[10px]">{s.type}</Badge>
                <Badge variant="secondary" className="text-[10px]">Cap. {s.capacite}</Badge>
                {s.classe !== "—" && <Badge className="text-[10px]">{s.classe}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
