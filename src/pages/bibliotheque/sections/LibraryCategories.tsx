import { SettingsSection } from "@/components/settings/SettingsSection";
import { Tag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const cats = [
  { nom: "Romans", count: 1840, tags: ["Africain", "Classique", "Contemporain"] },
  { nom: "Manuels scolaires", count: 2710, tags: ["Primaire", "Collège", "Lycée"] },
  { nom: "Sciences", count: 1280, tags: ["Maths", "Physique", "SVT"] },
  { nom: "Jeunesse", count: 890, tags: ["Album", "BD", "Conte"] },
  { nom: "Documentaires", count: 720, tags: ["Histoire", "Géographie", "Nature"] },
  { nom: "Périodiques", count: 992, tags: ["Magazine", "Journal"] },
];

export default function LibraryCategories() {
  return (
    <SettingsSection
      title="Catégories & tags"
      description="Organisation thématique de la collection."
      icon={<Tag className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouvelle catégorie</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cats.map((c) => (
          <Card key={c.nom} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{c.nom}</h3>
                <Badge variant="secondary">{c.count}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
