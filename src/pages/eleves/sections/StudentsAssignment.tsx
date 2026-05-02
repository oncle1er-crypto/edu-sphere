import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Shuffle, Loader2 } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";

export default function StudentsAssignment() {
  const { classes, loading } = useClasses();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SettingsSection
      icon={<GraduationCap className="h-5 w-5" />}
      title="Affectation aux classes"
      description="Visualisez les effectifs et déplacez des élèves entre classes."
      hideSave
    >
      <div className="flex justify-end">
        <Button variant="outline"><Shuffle className="h-4 w-4" />Affectation automatique</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {classes.map((c) => {
          const effectif = c.effectif ?? 0;
          const capacite = c.capacite ?? 50;
          const pct = capacite > 0 ? Math.round((effectif / capacite) * 100) : 0;
          const full = pct >= 100;
          return (
            <Card key={c.id} className="border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold font-display">{c.nom}</h4>
                  <Badge variant={full ? "destructive" : "secondary"} className="text-[10px]">
                    {full ? "Pleine" : "Disponible"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Prof. principal : {c.prof_nom || "Non assigné"}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{effectif} / {capacite}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <Progress value={Math.min(pct, 100)} className="h-2" />
              </CardContent>
            </Card>
          );
        })}
        {classes.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">Aucune classe configurée.</p>
        )}
      </div>
    </SettingsSection>
  );
}
