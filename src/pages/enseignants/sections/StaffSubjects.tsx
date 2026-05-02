import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

interface MatiereAssignment {
  matiere_nom: string;
  enseignants: string[];
  classes: string[];
}

export default function StaffSubjects() {
  const { ecoleId } = useEcoleId();
  const [data, setData] = useState<MatiereAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    (async () => {
      const { data: rows, error } = await supabase
        .from("enseignant_matieres")
        .select("matieres(nom), enseignants(nom, prenom), classes(nom)")
        .eq("ecole_id", ecoleId);

      if (error) { console.error(error); setLoading(false); return; }

      const map = new Map<string, { enseignants: Set<string>; classes: Set<string> }>();
      (rows ?? []).forEach((r: any) => {
        const matNom = r.matieres?.nom ?? "?";
        if (!map.has(matNom)) map.set(matNom, { enseignants: new Set(), classes: new Set() });
        const entry = map.get(matNom)!;
        if (r.enseignants) entry.enseignants.add(`${r.enseignants.prenom} ${r.enseignants.nom}`);
        if (r.classes) entry.classes.add(r.classes.nom);
      });

      setData(Array.from(map.entries()).map(([nom, v]) => ({
        matiere_nom: nom,
        enseignants: Array.from(v.enseignants),
        classes: Array.from(v.classes),
      })));
      setLoading(false);
    })();
  }, [ecoleId]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<BookOpen className="h-5 w-5" />}
      title="Matières enseignées"
      description="Liste des matières et professeurs assignés."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map((m) => (
          <Card key={m.matiere_nom} className="border">
            <CardContent className="p-4 space-y-2">
              <h4 className="font-bold font-display">{m.matiere_nom}</h4>
              <div className="flex flex-wrap gap-1">
                {m.classes.map((c) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
              </div>
              <div className="pt-2 border-t">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Enseignants</p>
                <ul className="space-y-0.5">
                  {m.enseignants.map((p) => <li key={p} className="text-sm">{p}</li>)}
                </ul>
                {m.enseignants.length === 0 && <p className="text-xs text-muted-foreground">Aucun enseignant assigné</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">Aucune affectation matière trouvée.</p>
        )}
      </div>
    </SettingsSection>
  );
}
