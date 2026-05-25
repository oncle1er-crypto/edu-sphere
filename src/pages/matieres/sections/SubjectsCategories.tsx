import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Loader2 } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";

export default function SubjectsCategories() {
  const { matieres, loading } = useMatieres();
  const cats = Array.from(new Set(matieres.map((m) => m.categorie).filter(Boolean))).map((c) => ({
    nom: c as string,
    matieres: matieres.filter((m) => m.categorie === c),
  }));

  return (
    <SettingsSection
      icon={<Layers className="h-5 w-5" />}
      title="Catégories & types de matières"
      description="Regroupement automatique des matières existantes par catégorie. Pour créer une catégorie, ajoutez une matière avec une nouvelle valeur dans Liste des matières."
      hideSave
    >
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : cats.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune catégorie. Créez d'abord une matière.</p>
      ) : (
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
                      <span className={`h-1.5 w-1.5 rounded-full ${m.couleur || "bg-primary"} mr-1.5`} />
                      {m.code || m.nom}
                    </Badge>
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
