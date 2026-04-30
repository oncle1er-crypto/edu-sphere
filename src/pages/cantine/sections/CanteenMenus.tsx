import { SettingsSection } from "@/components/settings/SettingsSection";
import { UtensilsCrossed, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const menus = [
  { jour: "Lundi", entree: "Salade verte", plat: "Riz au poisson", dessert: "Fruit", prix: 500, kcal: 720 },
  { jour: "Mardi", entree: "Soupe de légumes", plat: "Poulet braisé + frites", dessert: "Yaourt", prix: 500, kcal: 850 },
  { jour: "Mercredi", entree: "Crudités", plat: "Couscous viande", dessert: "Fruit", prix: 500, kcal: 780 },
  { jour: "Jeudi", entree: "Salade composée", plat: "Spaghetti bolognaise", dessert: "Gâteau", prix: 500, kcal: 820 },
  { jour: "Vendredi", entree: "Soupe", plat: "Thiéboudienne", dessert: "Fruit", prix: 500, kcal: 760 },
];

export default function CanteenMenus() {
  return (
    <SettingsSection
      title="Menus de la semaine"
      description="Composez et publiez les repas servis."
      icon={<UtensilsCrossed className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouveau menu</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {menus.map((m) => (
          <Card key={m.jour} className="border shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base font-display">{m.jour}</CardTitle>
              <Badge variant="secondary">{m.prix} FCFA</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Entrée</span><span className="font-medium">{m.entree}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Plat</span><span className="font-medium">{m.plat}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dessert</span><span className="font-medium">{m.dessert}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Apport</span><span className="font-medium">{m.kcal} kcal</span></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
