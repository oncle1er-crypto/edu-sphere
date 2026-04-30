import { SettingsSection } from "@/components/settings/SettingsSection";
import { Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const news = [
  { title: "Vacances de Pâques", excerpt: "L'établissement sera fermé du 1er au 14 avril 2026.", date: "28/03/2026", cible: "Tous", statut: "Publiée" },
  { title: "Concours d'éloquence", excerpt: "Inscriptions ouvertes jusqu'au 15 mai. 3 prix à gagner.", date: "20/04/2026", cible: "Lycée", statut: "Publiée" },
  { title: "Sortie pédagogique 5ème", excerpt: "Visite du musée de la civilisation noire prévue le 10 mai.", date: "29/04/2026", cible: "Parents 5ème", statut: "Brouillon" },
];

export default function Announcements() {
  return (
    <SettingsSection
      title="Annonces & actualités"
      description="Publications visibles dans l'app et le portail web."
      icon={<Megaphone className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouvelle annonce</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {news.map((n, i) => (
          <Card key={i} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold">{n.title}</h3>
                <Badge variant={n.statut === "Publiée" ? "default" : "secondary"}>{n.statut}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{n.excerpt}</p>
              <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-2">
                <span>{n.date}</span>
                <Badge variant="outline">{n.cible}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
