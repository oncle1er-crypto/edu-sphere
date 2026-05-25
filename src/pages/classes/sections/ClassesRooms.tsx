import { useMemo } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, BookOpen, Loader2 } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";

export default function ClassesRooms() {
  const { classes, loading } = useClasses();

  const salles = useMemo(() => {
    const map = new Map<string, { code: string; classes: typeof classes; capacite: number; effectif: number }>();
    classes.forEach((c) => {
      const code = (c.salle || "").trim();
      if (!code) return;
      const entry = map.get(code) ?? { code, classes: [] as any, capacite: 0, effectif: 0 };
      entry.classes.push(c);
      entry.capacite += c.capacite ?? 0;
      entry.effectif += c.effectif ?? 0;
      map.set(code, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [classes]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<MapPin className="h-5 w-5" />}
      title={`Salles de classe (${salles.length})`}
      description="Salles attribuées aux classes. Modifiez la salle d'une classe depuis « Toutes les classes »."
      hideSave
    >
      {salles.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucune salle attribuée. Ajoutez une salle à une classe depuis la liste des classes.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {salles.map((s) => (
            <Card key={s.code} className="border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold font-display text-sm">Salle {s.code}</p>
                      <p className="text-[11px] text-muted-foreground">{s.classes.length} classe(s)</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {s.effectif}/{s.capacite}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 pt-2 border-t">
                  {s.classes.map((c) => (
                    <Badge key={c.id} variant="secondary" className="text-[10px]">{c.nom}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
