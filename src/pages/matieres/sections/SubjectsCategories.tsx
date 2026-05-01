import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Plus } from "lucide-react";
import { SUBJECTS } from "../data";

export default function SubjectsCategories() {
  const cats = Array.from(new Set(SUBJECTS.map((s) => s.categorie))).map((c) => ({
    nom: c,
    matieres: SUBJECTS.filter((s) => s.categorie === c),
  }));

  return (
    <SettingsSection
      icon={<Layers className="h-5 w-5" />}
      title="Catégories & types de matières"
      description="Regroupez les disciplines par grande famille pour faciliter l'administration."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm"><Plus className="h-4 w-4" />Nouvelle catégorie</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cats.map((c) => (
          <Card key={c.nom} className="border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-primary">{c.nom}</h3>
                <Badge variant="secondary">{c.matieres.length} matières</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.matieres.map((m) => (
                  <Badge key={m.id} variant="outline" className="text-[11px]">
                    <span className={`h-1.5 w-1.5 rounded-full ${m.couleur} mr-1.5`} />
                    {m.code}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
