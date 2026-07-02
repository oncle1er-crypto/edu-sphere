import { SettingsSection } from "@/components/settings/SettingsSection";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Loader2 } from "lucide-react";
import { useCycles } from "@/hooks/useCycles";
import { useClasses } from "@/hooks/useClasses";

const colors = ["bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-cyan-500"];

export default function ClassesCycles() {
  const { cycles, loading: cyclesLoading } = useCycles();
  const { activeAnnee } = useAcademicPeriod();
  const { classes, loading: classesLoading } = useClasses(activeAnnee.id);

  if (cyclesLoading || classesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const cycleData = cycles.map((cy, i) => {
    const cls = classes.filter((c) => c.cycle_nom === cy.nom);
    return { ...cy, nbClasses: cls.length, color: colors[i % colors.length] };
  });

  return (
    <SettingsSection
      icon={<Layers className="h-5 w-5" />}
      title="Cycles & niveaux"
      description="Structure pédagogique de l'établissement."
      hideSave
    >
      {cycleData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun cycle configuré. Ajoutez des cycles dans les paramètres.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cycleData.map((c) => (
            <Card key={c.id} className="border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${c.color}`} />
                    <h4 className="font-bold font-display text-lg">{c.nom}</h4>
                  </div>
                  <Badge>{c.nbClasses} classes</Badge>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                    Classes rattachées
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {classes
                      .filter((cl) => cl.cycle_nom === c.nom)
                      .map((cl) => (
                        <Badge key={cl.id} variant="secondary" className="text-[10px]">
                          {cl.nom} ({cl.effectif ?? 0})
                        </Badge>
                      ))}
                    {c.nbClasses === 0 && (
                      <span className="text-xs text-muted-foreground">Aucune classe</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
